const express = require("express");
const router = express.Router();
const isAuthenticated = require("../middleware/auth");

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

        if (results.length === 0) {
            return res.status(200).json({ success: true, accounts: [], totalPages: 0 });
        }

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

// Route to get a single account by ID (accessible to admins)
router.get("/:id", isAuthenticated("Admin"), (req, res) => {
    const db = req.app.get("db");
    const userId = req.params.id;

    const query = `
        SELECT 
            u.id AS id, 
            u.username AS username, 
            u.role AS role, 
            u.branch_id AS branch_id, 
            b.name AS branch_name
        FROM users u
        LEFT JOIN branches b ON u.branch_id = b.id
        WHERE u.id = ?;
    `;

    db.query(query, [userId], (err, results) => {
        if (err) {
            console.error("Error fetching account details:", err);
            return res.status(500).json({ success: false, message: "Failed to fetch account details" });
        }

        if (results.length === 0) {
            return res.status(404).json({ success: false, message: "Account not found" });
        }

        res.json({
            success: true,
            account: {
                id: results[0].id,
                username: results[0].username,
                role: results[0].role,
                branch_id: results[0].role === "Admin" ? null : results[0].branch_id, // Return null for admin
                branch_name: results[0].role === "Admin" ? "N/A" : results[0].branch_name // Show N/A for admin
            },
        });
    });
});

// Route to update an existing account (accessible to admins)
router.put("/:id", isAuthenticated("Admin"), (req, res) => {
    const db = req.app.get("db");
    const { username, role, branch_id } = req.body;
    const userId = req.params.id;

    if (!username || !role) {
        return res.status(400).json({ error: "Username and role are required fields." });
    }

    // Set branch_id to null if the role is Admin
    const updatedBranchId = role === "Admin" ? null : branch_id;

    const query = `
        UPDATE users
        SET username = ?, role = ?, branch_id = ?
        WHERE id = ?
    `;
    const params = [username, role, updatedBranchId, userId];

    db.query(query, params, (err, result) => {
        if (err) {
            console.error("Error updating account:", err);
            return res.status(500).json({ error: "Failed to update account" });
        }

        if (result.affectedRows === 0) {
            return res.status(404).json({ error: "Account not found" });
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
