const express = require("express");
const pool = require("../config/database");
const router = express.Router();

/*
|--------------------------------------------------------------------------
| Resolve raw user ids / device imeis into readable "Name(Email)" or
| "VehicleName(IMEI)" labels, reversing the stored comma-separated order
| (last received value shown first).
|--------------------------------------------------------------------------
*/

function reverseIds(ids) {
    return [...ids].reverse();
}

async function resolveMappedDisplay(typeOfData, userValue, imeiValue) {

    if (typeOfData === "user") {
        const ids = reverseIds(
            (userValue || "").split(",").map(item => item.trim()).filter(Boolean)
        );

        if (ids.length === 0) {
            return [];
        }

        const [userRows] = await pool.query(
            "SELECT id, name, email FROM users WHERE id IN (?)",
            [ids]
        );

        const userMap = new Map(userRows.map(user => [String(user.id), `${user.name}(${user.email})`]));

        return ids.map(id => ({ value: id, label: userMap.get(String(id)) || id }));
    }

    if (typeOfData === "imei") {
        const imeis = reverseIds(
            (imeiValue || "").split(",").map(item => item.trim()).filter(Boolean)
        );

        if (imeis.length === 0) {
            return [];
        }

        const [imeiRows] = await pool.query(
            "SELECT vehicle_name, deviceimei FROM live_data WHERE deviceimei IN (?)",
            [imeis]
        );

        const imeiMap = new Map(imeiRows.map(row => [String(row.deviceimei), `${row.vehicle_name}(${row.deviceimei})`]));

        return imeis.map(imei => ({ value: imei, label: imeiMap.get(String(imei)) || imei }));
    }

    return [];
}

/*
|--------------------------------------------------------------------------
| Get receiver list
|--------------------------------------------------------------------------
*/

router.get("/", async (req, res) => {

    try {
        const [rows] = await pool.query(
            "SELECT id, receiver_name FROM custom_push_api ORDER BY id ASC"
        );

        return res.json({
            success: true,
            receivers: rows
        });

    } catch (error) {
        console.error("Fetch receivers error:", error);

        return res.status(500).json({
            success: false,
            message: "Failed to fetch receivers."
        });
    }
});

/*
|--------------------------------------------------------------------------
| Search users / imeis for autocomplete suggestions (min 4 characters)
|--------------------------------------------------------------------------
*/

router.get("/search/:type", async (req, res) => {

    const { type } = req.params;
    const query = (req.query.q || "").trim();

    if (query.length <= 3) {
        return res.json({ success: true, results: [] });
    }

    try {
        const like = `%${query}%`;

        if (type === "user") {
            const [rows] = await pool.query(
                "SELECT id, name, email FROM users WHERE name LIKE ? OR email LIKE ? LIMIT 10",
                [like, like]
            );

            return res.json({
                success: true,
                results: rows.map(row => ({ value: row.id, label: `${row.name}(${row.email})` }))
            });
        }

        if (type === "imei") {
            const [rows] = await pool.query(
                "SELECT vehicle_name, deviceimei FROM live_data WHERE vehicle_name LIKE ? OR deviceimei LIKE ? LIMIT 10",
                [like, like]
            );

            return res.json({
                success: true,
                results: rows.map(row => ({ value: row.deviceimei, label: `${row.vehicle_name}(${row.deviceimei})` }))
            });
        }

        return res.status(400).json({ success: false, message: "Invalid search type." });

    } catch (error) {
        console.error("Search suggestions error:", error);

        return res.status(500).json({
            success: false,
            message: "Failed to fetch suggestions."
        });
    }
});

/*
|--------------------------------------------------------------------------
| Get receiver mapping details
|--------------------------------------------------------------------------
*/

router.get("/:id", async (req, res) => {

    try {
        const [rows] = await pool.query(
            "SELECT receiver_name, type_of_data, user_value, imei_value FROM custom_push_api WHERE id = ?",
            [req.params.id]
        );

        if (rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Receiver not found."
            });
        }

        const { receiver_name, type_of_data, user_value, imei_value } = rows[0];
        const mappedDisplay = await resolveMappedDisplay(type_of_data, user_value, imei_value);

        return res.json({
            success: true,
            receiver: {
                receiver_name,
                type_of_data,
                user_value,
                imei_value,
                mapped_display: mappedDisplay
            }
        });

    } catch (error) {
        console.error("Fetch receiver details error:", error);

        return res.status(500).json({
            success: false,
            message: "Failed to fetch receiver details."
        });
    }
});

/*
|--------------------------------------------------------------------------
| Update receiver mapping (comma-separated user ids or device imeis)
|--------------------------------------------------------------------------
*/

router.put("/:id", async (req, res) => {

    const { type_of_data, values } = req.body;

    if (type_of_data !== "user" && type_of_data !== "imei") {
        return res.status(400).json({
            success: false,
            message: "Invalid type_of_data."
        });
    }

    const joinedValues = Array.isArray(values)
        ? values.map(value => String(value).trim()).filter(Boolean).join(",")
        : "";

    const updatedBy = req.session.user.id;
    const ipAddress = (req.headers["x-forwarded-for"] || "").split(",")[0].trim() || req.socket.remoteAddress;

    try {
        const column = type_of_data === "user" ? "user_value" : "imei_value";

        const [result] = await pool.query(
            `UPDATE custom_push_api SET ${column} = ?, updated_by = ?, ip_address = ? WHERE id = ?`,
            [joinedValues, updatedBy, ipAddress, req.params.id]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({
                success: false,
                message: "Receiver not found."
            });
        }

        return res.json({
            success: true,
            message: "Receiver mapping updated."
        });

    } catch (error) {
        console.error("Update receiver mapping error:", error);

        return res.status(500).json({
            success: false,
            message: "Failed to update receiver mapping."
        });
    }
});

module.exports = router;
