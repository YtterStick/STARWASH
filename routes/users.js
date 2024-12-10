const express = require("express");
const bcrypt = require("bcryptjs");
const router = express.Router();
const isAuthenticated = require("../middleware/auth"); // Correct import path for the middleware
const logAuditTrail = require("../utils/logAuditTrail"); // Import the logAuditTrail function

// Login Route
router.post("/login", (req, res) => {
    const { username, password } = req.body;
    const db = req.app.get("db"); // Get the DB connection

    const query = "SELECT * FROM users WHERE username = ?";
    db.query(query, [username], async (err, results) => {
        if (err || results.length === 0) {
            // Log failed login attempt
            logAuditTrail(db, null, "LOGIN", "User", null, { username, status: "failed", reason: "User not found" }, null);

            return res.status(400).send("User not found.");
        }

        const user = results[0];

        const isValid = await bcrypt.compare(password, user.password);
        if (!isValid) {
            // Log failed login attempt
            logAuditTrail(db, null, "LOGIN", "User", null, { username, status: "failed", reason: "Invalid password" }, null);

            return res.status(400).send("Invalid password.");
        }

        // Log successful login attempt
        logAuditTrail(db, user.id, "LOGIN", "User", user.id, { username, status: "successful" }, user.branch_id);

        req.session.user = { id: user.id, role: user.role, branch_id: user.branch_id };

        res.status(200).json({
            userId: user.id,
            role: user.role,
            branch_id: user.branch_id,
        });
    });
});

// Logout Route
router.get("/logout", isAuthenticated(), (req, res) => {
    const db = req.app.get("db"); // Get the DB connection
    const userId = req.session.user ? req.session.user.id : null;

    // Log the logout action in the audit trail
    logAuditTrail(db, userId, "LOGOUT", "User", userId, { status: "successful" }, req.session.user.branch_id);

    req.session.destroy((err) => {
        if (err) {
            console.error("Error during logout:", err);
            return res.status(500).send("Error during logout");
        }

        res.clearCookie('connect.sid');
        res.redirect("/");
    });
});

module.exports = router;
