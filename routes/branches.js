const express = require("express");
const router = express.Router();
const isAuthenticated = require("../middleware/auth"); // Ensure user is authenticated

// Route to create a new branch (accessible to admins only)
router.post("/", isAuthenticated("Admin"), (req, res) => {
    const db = req.app.get("db");
    const { name, address } = req.body;

    // Validate that name is provided
    if (!name) {
        return res.status(400).json({ error: "Branch name is required" });
    }

    // Insert query to create a new branch
    const query = `
        INSERT INTO branches (name, address)
        VALUES (?, ?)
    `;

    db.query(query, [name, address], (err, result) => {
        if (err) {
            console.error("Error creating branch:", err);
            return res.status(500).json({ error: "Failed to create branch" });
        }

        res.status(201).json({ message: "Branch created successfully", branchId: result.insertId });
    });
});

// Optional: Route to get all branches (for use in the create account page)
router.get("/", isAuthenticated("Admin"), (req, res) => {
    const db = req.app.get("db");

    const query = `
        SELECT id, name, address
        FROM branches
    `;

    db.query(query, (err, results) => {
        if (err) {
            console.error("Error fetching branches:", err);
            return res.status(500).json({ error: "Failed to fetch branches" });
        }

        res.status(200).json(results);
    });
});

module.exports = router;
