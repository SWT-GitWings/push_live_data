const express = require("express");
const bcrypt = require("bcrypt");

const pool = require("../config/database");

const router = express.Router();

/*
|--------------------------------------------------------------------------
| Login
|--------------------------------------------------------------------------
*/

router.post("/login", async (req, res) => {

    try {

        const {
            username,
            password
        } = req.body;

        if (!username || !password) {

            return res.status(400).json({
                success: false,
                message: "Username and password are required."
            });

        }

        const [rows] = await pool.execute(
            `
            SELECT
                id,
                username,
                password,
                name,
                status
            FROM users
            WHERE username = ?
            LIMIT 1
            `,
            [username]
        );

        if (rows.length === 0) {

            return res.status(401).json({
                success: false,
                message: "Invalid username or password."
            });

        }

        const user = rows[0];

        if (!user.status) {

            return res.status(403).json({
                success: false,
                message: "User account is disabled."
            });

        }

        const passwordMatch = await bcrypt.compare(
            password,
            user.password
        );

        if (!passwordMatch) {

            return res.status(401).json({
                success: false,
                message: "Invalid username or password."
            });

        }

        /*
        |--------------------------------------------------------------------------
        | Create session
        |--------------------------------------------------------------------------
        */

        req.session.user = {
            id: user.id,
            username: user.username,
            name: user.name
        };

        return res.json({
            success: true,
            message: "Login successful.",
            redirect: "/push-live-data.html"
        });

    } catch (error) {

        console.error("Login error:", error);

        return res.status(500).json({
            success: false,
            message: "Internal server error."
        });
    }
});


/*
|--------------------------------------------------------------------------
| Logout
|--------------------------------------------------------------------------
*/

router.post("/logout", (req, res) => {

    req.session.destroy((error) => {

        if (error) {

            return res.status(500).json({
                success: false,
                message: "Logout failed."
            });
        }

        res.clearCookie("connect.sid");

        return res.json({
            success: true,
            redirect: "/login"
        });

    });

});


module.exports = router;