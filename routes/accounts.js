const express = require("express");
const router = express.Router();
const isAuthenticated = require("../middleware/auth"); // Assuming you're using the role middleware here

// Route to get all accounts (accessible to admins only)
router.get("/", isAuthenticated("Admin"), (req, res) => {
    const db = req.app.get("db");
    const userRole = req.session.user.role;
    const userBranchId = req.session.user.branch_id;
    const { page = 1, limit = 5 } = req.query;
    const offset = (page - 1) * limit;

    let query;
    const queryParams = [];
    
    if (userRole === "Admin") {
        query = `
            SELECT u.id, u.username, u.role, b.name AS branch_name
            FROM users u
            LEFT JOIN branches b ON u.branch_id = b.id
            LIMIT ? OFFSET ?;
        `;
        queryParams.push(parseInt(limit), parseInt(offset));
    } else {
        query = `
            SELECT u.id, u.username, u.role, b.name AS branch_name
            FROM users u
            LEFT JOIN branches b ON u.branch_id = b.id
            WHERE u.branch_id = ?
            LIMIT ? OFFSET ?;
        `;
        queryParams.push(userBranchId, parseInt(limit), parseInt(offset));
    }

    db.query(query, queryParams, (err, results) => {
        if (err) {
            console.error("Error fetching accounts:", err);
            return res.status(500).json({ success: false, message: "Failed to fetch accounts" });
        }

        console.log("Accounts data:", results); // Debugging log

        if (results.length === 0) {
            return res.status(200).json({ success: true, accounts: [], totalPages: 0 });
        }

        // Count total records for pagination
        const countQuery = userRole === "Admin"
            ? `SELECT COUNT(*) AS total FROM users`
            : `SELECT COUNT(*) AS total FROM users WHERE branch_id = ?`;

        db.query(countQuery, [userRole === "Admin" ? null : userBranchId], (countErr, countResult) => {
            if (countErr) {
                console.error("Error counting total records:", countErr);
                return res.status(500).json({ success: false, message: "Failed to count records" });
            }

            const totalRecords = countResult[0].total;
            const totalPages = Math.ceil(totalRecords / limit);

            res.status(200).json({
                success: true,
                accounts: results,
                totalPages: totalPages
            });
        });
    });
});

// Route to create a new account (accessible to admins)
router.post("/", isAuthenticated("Admin"), (req, res) => {
    const db = req.app.get("db");
    const { username, password, role, branch_id } = req.body;

    // Basic validation for required fields
    if (!username || !password || !role || !branch_id) {
        return res.status(400).json({ error: "All fields are required" });
    }

    // Insert query to create a new user
    const query = `
        INSERT INTO users (username, password, role, branch_id)
        VALUES (?, ?, ?, ?)
    `;
    
    db.query(query, [username, password, role, branch_id], (err, result) => {
        if (err) {
            console.error("Error creating account:", err);
            return res.status(500).json({ error: "Failed to create account" });
        }

        res.status(201).json({ message: "Account created successfully", userId: result.insertId });
    });
});

// Route to update an existing account (accessible to admins)
router.put("/:id", isAuthenticated("Admin"), (req, res) => {
    const db = req.app.get("db");
    const { username, password, role, branch_id } = req.body;
    const userId = req.params.id;

    const query = `
        UPDATE users
        SET username = ?, password = ?, role = ?, branch_id = ?
        WHERE id = ?
    `;
    
    db.query(query, [username, password, role, branch_id, userId], (err, result) => {
        if (err) {
            console.error("Error updating account:", err);
            return res.status(500).json({ error: "Failed to update account" });
        }

        res.json({ message: "Account updated successfully" });
    });
});

// Route to delete an account (accessible to admins)
router.delete("/:id", isAuthenticated("Admin"), (req, res) => {
    const db = req.app.get("db");
    const userId = req.params.id;

    const query = "DELETE FROM users WHERE id = ?";

    db.query(query, [userId], (err, result) => {
        if (err) {
            console.error("Error deleting account:", err);
            return res.status(500).json({ error: "Failed to delete account" });
        }

        res.json({ message: "Account deleted successfully" });
    });
});

module.exports = router;
