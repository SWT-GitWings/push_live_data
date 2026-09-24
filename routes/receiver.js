const express = require("express");
const pool = require("../config/database");
const router = express.Router();

/*
|--------------------------------------------------------------------------
| Resolve raw user ids / device imeis into readable "Name(Email)" or
| "VehicleName(IMEI)" labels, preserving the original stored order.
|--------------------------------------------------------------------------
*/

function sortIdsDescending(ids) {
    return [...ids].sort((a, b) => (BigInt(a) > BigInt(b) ? -1 : 1));
}

async function resolveMappedDisplay(typeOfData, userValue, imeiValue) {

    if (typeOfData === "user") {
        const ids = sortIdsDescending(
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

        return ids.map(id => userMap.get(String(id)) || id);
    }

    if (typeOfData === "imei") {
        const imeis = sortIdsDescending(
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

        return imeis.map(imei => imeiMap.get(String(imei)) || imei);
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

module.exports = router;
