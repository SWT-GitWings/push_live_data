const express = require("express");
const pool = require("../config/database");
const router = express.Router();

/*
|--------------------------------------------------------------------------
| Resolve the caller's IP, preferring a proxy-forwarded address
|--------------------------------------------------------------------------
*/

function getClientIp(req) {
    return (req.headers["x-forwarded-for"] || "").split(",")[0].trim() || req.socket.remoteAddress;
}

function isValidPayload({ imei, latitude, longitude, start_time, end_time }) {
    return Boolean(
        imei &&
        String(imei).trim() &&
        Number.isFinite(Number(latitude)) &&
        Number.isFinite(Number(longitude)) &&
        start_time &&
        end_time
    );
}

/*
|--------------------------------------------------------------------------
| List mines push records (optional ?search= imei filter)
|--------------------------------------------------------------------------
*/

router.get("/", async (req, res) => {

    const search = (req.query.search || "").trim();

    try {
        const [rows] = search
            ? await pool.query(
                "SELECT * FROM mines_offline_push_api WHERE imei LIKE ? ORDER BY id DESC",
                [`%${search}%`]
            )
            : await pool.query(
                "SELECT * FROM mines_offline_push_api ORDER BY id DESC"
            );

        return res.json({
            success: true,
            records: rows
        });

    } catch (error) {
        console.error("Fetch mines push records error:", error);

        return res.status(500).json({
            success: false,
            message: "Failed to fetch mines push records."
        });
    }
});

/*
|--------------------------------------------------------------------------
| Create a mines push record
|--------------------------------------------------------------------------
*/

router.post("/", async (req, res) => {

    const { imei, latitude, longitude, start_time, end_time, active_status } = req.body;

    if (!isValidPayload(req.body)) {
        return res.status(400).json({
            success: false,
            message: "imei, latitude, longitude, start_time and end_time are required."
        });
    }

    const createdBy = req.session.user.id;
    const ipAddress = getClientIp(req);

    try {
        const [result] = await pool.query(
            `INSERT INTO mines_offline_push_api
                (imei, latitude, longitude, start_time, end_time, active_status, created_by, ip_address)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                String(imei).trim(),
                Number(latitude),
                Number(longitude),
                start_time,
                end_time,
                active_status ? 1 : 0,
                createdBy,
                ipAddress
            ]
        );

        return res.status(201).json({
            success: true,
            message: "Mines push record created.",
            id: result.insertId
        });

    } catch (error) {
        console.error("Create mines push record error:", error);

        return res.status(500).json({
            success: false,
            message: "Failed to create mines push record."
        });
    }
});

/*
|--------------------------------------------------------------------------
| Update a mines push record
|--------------------------------------------------------------------------
*/

router.put("/:id", async (req, res) => {

    const { imei, latitude, longitude, start_time, end_time, active_status } = req.body;

    if (!isValidPayload(req.body)) {
        return res.status(400).json({
            success: false,
            message: "imei, latitude, longitude, start_time and end_time are required."
        });
    }

    const updatedBy = req.session.user.id;
    const ipAddress = getClientIp(req);

    try {
        const [result] = await pool.query(
            `UPDATE mines_offline_push_api
             SET imei = ?, latitude = ?, longitude = ?, start_time = ?, end_time = ?,
                 active_status = ?, updated_by = ?, ip_address = ?
             WHERE id = ?`,
            [
                String(imei).trim(),
                Number(latitude),
                Number(longitude),
                start_time,
                end_time,
                active_status ? 1 : 0,
                updatedBy,
                ipAddress,
                req.params.id
            ]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({
                success: false,
                message: "Mines push record not found."
            });
        }

        return res.json({
            success: true,
            message: "Mines push record updated."
        });

    } catch (error) {
        console.error("Update mines push record error:", error);

        return res.status(500).json({
            success: false,
            message: "Failed to update mines push record."
        });
    }
});

/*
|--------------------------------------------------------------------------
| Toggle active/inactive status only
|--------------------------------------------------------------------------
*/

router.patch("/:id/status", async (req, res) => {

    const activeStatus = Number(req.body.active_status);

    if (activeStatus !== 0 && activeStatus !== 1) {
        return res.status(400).json({
            success: false,
            message: "active_status must be 0 or 1."
        });
    }

    const updatedBy = req.session.user.id;
    const ipAddress = getClientIp(req);

    try {
        const [result] = await pool.query(
            "UPDATE mines_offline_push_api SET active_status = ?, updated_by = ?, ip_address = ? WHERE id = ?",
            [activeStatus, updatedBy, ipAddress, req.params.id]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({
                success: false,
                message: "Mines push record not found."
            });
        }

        return res.json({
            success: true,
            message: "Mines push status updated."
        });

    } catch (error) {
        console.error("Update mines push status error:", error);

        return res.status(500).json({
            success: false,
            message: "Failed to update mines push status."
        });
    }
});

module.exports = router;
