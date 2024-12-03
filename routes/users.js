const express = require("express");
const bcrypt = require("bcryptjs");
const router = express.Router();
const isAuthenticated = require("../middleware/auth"); // Correct import path for the middleware

router.post("/login", (req, res) => {
    const { username, password } = req.body;
    const db = req.app.get("db");

    const query = "SELECT * FROM users WHERE username = ?";
    db.query(query, [username], async (err, results) => {
        if (err || results.length === 0) {
            return res.status(400).send("User not found.");
        }

        const user = results[0];

        const isValid = await bcrypt.compare(password, user.password);
        if (!isValid) {
            return res.status(400).send("Invalid password.");
        }

        req.session.user = { id: user.id, role: user.role, branch_id: user.branch_id };

        res.status(200).json({
            userId: user.id,
            role: user.role,
            branch_id: user.branch_id,
        });
    });
});

router.get("/logout", isAuthenticated(), (req, res) => {
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
