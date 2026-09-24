/*
|--------------------------------------------------------------------------
| Auth Middleware
|--------------------------------------------------------------------------
*/

function isAuthenticated(req, res, next) {

    if (req.session && req.session.user) {
        return next();
    }

    if (req.originalUrl.startsWith("/api/")) {

        return res.status(401).json({
            success: false,
            message: "Please log in to continue."
        });
    }

    return res.redirect("/login");
}

module.exports = isAuthenticated;
