require("dotenv").config();

const express = require("express");
const path = require("path");
const session = require("express-session");

const authRoutes = require("./routes/auth");
const authMiddleware = require("./middleware/authMiddleware");

const app = express();

const PORT = process.env.PORT || 3000;

/*
|--------------------------------------------------------------------------
| Middleware
|--------------------------------------------------------------------------
*/

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(
    session({
        secret: process.env.SESSION_SECRET,

        resave: false,
        saveUninitialized: false,

        cookie: {
            httpOnly: true,
            secure: false,
            maxAge: 1000 * 60 * 60 * 8
        }
    })
);

/*
|--------------------------------------------------------------------------
| Static files
|--------------------------------------------------------------------------
*/

app.use(
    "/public",
    express.static(
        path.join(__dirname, "public")
    )
);

/*
|--------------------------------------------------------------------------
| Routes
|--------------------------------------------------------------------------
*/

app.use("/api/auth", authRoutes);

/*
|--------------------------------------------------------------------------
| Login page
|--------------------------------------------------------------------------
*/

app.get("/login", (req, res) => {

    if (req.session.user) {
        return res.redirect("/push-live-data.html");
    }

    res.sendFile(
        path.join(__dirname, "public", "login.html")
    );
});

/*
|--------------------------------------------------------------------------
| Protected page
|--------------------------------------------------------------------------
*/

app.get("/push-live-data.html", authMiddleware, (req, res) => {
    res.sendFile(
        path.join(__dirname, "protected", "push-live-data.html")
    );
});

/*
|--------------------------------------------------------------------------
| Default route
|--------------------------------------------------------------------------
*/

app.get("/", (req, res) => {
    if (req.session.user) {
        return res.redirect("/push-live-data.html");
    }

    res.redirect("/login");
});

/*
|--------------------------------------------------------------------------
| Start server
|--------------------------------------------------------------------------
*/

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});