const express = require("express");
const pool = require("../config/database");
const router = express.Router();

/*
|--------------------------------------------------------------------------
| Get receiver list
|--------------------------------------------------------------------------
*/

router.get("/", async (req, res) => {

    try {
        const [rows] = await pool.query(
            "SELECT DISTINCT receiver_name FROM custom_push_api ORDER BY receiver_name"
        );

        return res.json({
            success: true,
            receivers: rows.map((row) => row.receiver_name)
        });

    } catch (error) {
        console.error("Fetch receivers error:", error);

        return res.status(500).json({
            success: false,
            message: "Failed to fetch receivers."
        });
    }
});

module.exports = router;
