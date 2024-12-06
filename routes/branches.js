const express = require("express");
const router = express.Router();
const isAuthenticated = require("../middleware/auth"); 

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

router.get("/", isAuthenticated("Admin"), (req, res) => {
    const db = req.app.get("db");

    const query = `
        SELECT b.id, b.name, b.address, IFNULL(u.user_count, 0) AS user_count
        FROM branches b
        LEFT JOIN (
            SELECT branch_id, COUNT(*) AS user_count
            FROM users
            GROUP BY branch_id
        ) u ON b.id = u.branch_id;
    `;

    db.query(query, (err, results) => {
        if (err) {
            console.error("Error fetching branches:", err);
            return res.status(500).json({ error: "Failed to fetch branches" });
        }

        console.log("Fetched branches data:", results); // Debugging line to check data
        res.status(200).json(results);
    });
});
// Route to get total number of branches
router.get("/total-branches", isAuthenticated("Admin"), (req, res) => {
    const db = req.app.get("db");

    const query = `
        SELECT COUNT(*) AS total_branches
        FROM branches;
    `;

    db.query(query, (err, result) => {
        if (err) {
            console.error("Error fetching total branches:", err);
            return res.status(500).json({ error: "Failed to fetch total branches." });
        }

        res.status(200).json({
            success: true,
            total_branches: result[0]?.total_branches || 0
        });
    });
});

// Route to get total number of users
router.get("/total-users", isAuthenticated("Admin"), (req, res) => {
    const db = req.app.get("db");

    const query = `
        SELECT COUNT(*) AS total_users
        FROM users;
    `;

    db.query(query, (err, result) => {
        if (err) {
            console.error("Error fetching total users:", err);
            return res.status(500).json({ error: "Failed to fetch total users." });
        }

        res.status(200).json({
            success: true,
            total_users: result[0]?.total_users || 0
        });
    });
});


router.get("/sales-records", isAuthenticated("Admin"), (req, res) => {
    const db = req.app.get("db");
    const {
        branch_id,
        start_date,
        end_date,
        sort_option = "created_at", // Default sorting by created_at
        page = 1,                  // Default page
        limit = 10                 // Default records per page
    } = req.query;

    const offset = (page - 1) * limit; // Calculate offset for pagination

    // Validate branch_id
    if (!branch_id) {
        return res.status(400).json({ success: false, message: "Branch ID is required." });
    }

    // Calculate default date range for the current year
    const currentYear = new Date().getFullYear();
    const defaultStartDate = `${currentYear}-01-01`;
    const defaultEndDate = `${currentYear}-12-31`;

    const effectiveStartDate = start_date || defaultStartDate;
    const effectiveEndDate = end_date || defaultEndDate;

    // Validate sort_option (use a whitelist for safe column names)
    const validSortOptions = ["created_at", "paid_at", "claimed_at"];
    if (!validSortOptions.includes(sort_option)) {
        return res.status(400).json({ success: false, message: "Invalid sort option." });
    }

    // Query for sales records with filters
    const query = `
        SELECT 
            customer_name, 
            fabric_softener_count, 
            detergent_count, 
            number_of_loads, 
            total_cost, 
            payment_status, 
            claimed_status, 
            created_at, 
            paid_at, 
            claimed_at
        FROM sales_orders
        WHERE branch_id = ? 
        AND DATE(created_at) BETWEEN ? AND ?
        ORDER BY ${sort_option} DESC
        LIMIT ? OFFSET ?;
    `;
    const countQuery = `
        SELECT COUNT(*) AS total_records
        FROM sales_orders
        WHERE branch_id = ?
        AND DATE(created_at) BETWEEN ? AND ?;
    `;

    // Execute the main query
    db.query(query, [branch_id, effectiveStartDate, effectiveEndDate, parseInt(limit), parseInt(offset)], (err, records) => {
        if (err) {
            console.error("Error fetching sales records:", err);
            return res.status(500).json({ success: false, message: "Failed to fetch sales records." });
        }

        // Execute the count query for pagination
        db.query(countQuery, [branch_id, effectiveStartDate, effectiveEndDate], (countErr, countResult) => {
            if (countErr) {
                console.error("Error counting sales records:", countErr);
                return res.status(500).json({ success: false, message: "Failed to fetch total record count." });
            }

            const totalRecords = countResult[0]?.total_records || 0;
            const totalPages = Math.ceil(totalRecords / limit);

            res.status(200).json({
                success: true,
                sales: records,
                totalPages: totalPages,
                currentPage: parseInt(page),
            });
        });
    });
});


router.get('/branches/reports', isAuthenticated("Admin"), (req, res) => {
    const db = req.app.get('db');
    const { branch_id, start_date, end_date } = req.query;

    if (!branch_id) {
        return res.status(400).json({ error: "Branch ID is required" });
    }

    // Construct the query for report data
    const query = `
        SELECT 
            MONTH(created_at) AS month,
            SUM(CASE WHEN payment_status = 'Paid' THEN total_cost ELSE 0 END) AS total_income,
            SUM(total_cost) AS expected_income,
            SUM(number_of_loads) AS total_sales
        FROM sales_orders
        WHERE branch_id = ? AND DATE(created_at) BETWEEN ? AND ?
        GROUP BY MONTH(created_at)
        ORDER BY month;
    `;

    db.query(query, [branch_id, start_date, end_date], (err, results) => {
        if (err) {
            console.error("Error fetching report data:", err);
            return res.status(500).json({ error: "Failed to fetch report data" });
        }

        // Calculate the deducted amount based on the results
        const reportData = results.map(row => ({
            month: row.month,
            total_income: row.total_income || 0,
            expected_income: row.expected_income || 0,
            deducted_amount: row.expected_income - row.total_income,
            total_sales: row.total_sales || 0
        }));

        res.status(200).json({ success: true, data: reportData });
    });
});

router.delete("/:branchId", isAuthenticated("Admin"), (req, res) => {
    const db = req.app.get("db");
    const { branchId } = req.params;

    const query = `
        DELETE FROM branches
        WHERE id = ?;
    `;

    db.query(query, [branchId], (err, result) => {
        if (err) {
            console.error("Error deleting branch:", err);
            return res.status(500).json({ success: false, message: "Failed to delete branch." });
        }

        res.status(200).json({ success: true, message: "Branch deleted successfully." });
    });
});

router.put("/:branchId", isAuthenticated("Admin"), (req, res) => {
    const db = req.app.get("db");
    const { branchId } = req.params;
    const { name, address } = req.body;

    if (!name) {
        return res.status(400).json({ success: false, message: "Branch name is required." });
    }

    const query = `
        UPDATE branches
        SET name = ?, address = ?
        WHERE id = ?;
    `;

    db.query(query, [name, address, branchId], (err, result) => {
        if (err) {
            console.error("Error updating branch:", err);
            return res.status(500).json({ success: false, message: "Failed to update branch." });
        }

        res.status(200).json({ success: true, message: "Branch updated successfully." });
    });
});



module.exports = router;
