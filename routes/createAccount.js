const express = require("express");
const bcrypt = require("bcryptjs");
const router = express.Router();

router.post("/", (req, res) => {
    const { username, role, branch_id, password } = req.body;

    console.log("Received data:", { username, role, branch_id, password }); // Debugging

    if (role !== "Admin" && role !== "Staff") {
        console.error("Invalid role provided:", role);
        return res.status(400).send("Invalid role provided");
    }

    if (role === "Staff" && !branch_id) {
        console.error("Branch ID is required for Staff accounts");
        return res.status(400).send("Branch ID is required for Staff accounts");
    }

    // If the role is Admin, set branch_id to null
    const finalBranchId = role === "Admin" ? null : branch_id;

    bcrypt.hash(password, 10, (err, hash) => {
        if (err) {
            console.error("Error hashing password:", err);
            return res.status(500).send("Error hashing password");
        }

        const sql = 'INSERT INTO users (username, role, branch_id, password) VALUES (?, ?, ?, ?)';
        const db = req.app.get("db");

        db.query(sql, [username, role, finalBranchId, hash], (err, result) => {
            if (err) {
                console.error("Error creating account:", err);
                return res.status(500).send("Error creating account");
            }
            res.status(200).send("Account created successfully");
        });
    });
});

module.exports = router;
