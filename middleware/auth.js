function isAuthenticated(role) {
    return function (req, res, next) {
        // Check if the user is authenticated
        if (req.session && req.session.user) {
            // Check if the user has the required role
            if (role && req.session.user.role !== role) {
                return res.status(403).send("Forbidden: You do not have the required role");
            }
            return next(); // Proceed to the next middleware/route
        } else {
            res.status(401).send("User not authenticated");
        }
    };
}


module.exports = isAuthenticated;
