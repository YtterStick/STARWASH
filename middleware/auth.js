function isAuthenticated(role) {
    return function (req, res, next) {
        if (req.session && req.session.user) {
            if (role && req.session.user.role !== role) {
                return res.status(403).send("Forbidden: You do not have the required role");
            }
            return next();
        } else {
            res.status(401).send("User not authenticated");
        }
    };
}

module.exports = isAuthenticated;
