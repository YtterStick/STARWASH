const express = require("express");
const router = express.Router();
const isAuthenticated = require("../middleware/auth");

const logAuditTrail = require("../utils/logAuditTrail");
router.post("/", isAuthenticated("Admin"), (req, res) => {
    const db = req.app.get("db"); // Get the DB connection
    const { name, address } = req.body;

    if (!name) {
        return res.status(400).json({ error: "Branch name is required" });
    }

    // Insert the new branch
    const branchQuery = `
        INSERT INTO branches (name, address) 
        VALUES (?, ?);
    `;

    db.query(branchQuery, [name, address], (err, result) => {
        if (err) {
            console.error("Error creating branch:", err);
            return res.status(500).json({ error: "Failed to create branch" });
        }

        // **Log Audit Trail for Branch Creation**
        logAuditTrail(db, req.session.user.id, "INSERT", "Branch", result.insertId, {
            name,
            address,
        }, req.session.user.branch_id);

        res.status(201).json({ message: "Branch created successfully." });
    });
});
// Route to fetch all branches
// Route to fetch all active (non-deleted) branches
router.get("/", isAuthenticated("Admin"), (req, res) => {
    const db = req.app.get("db"); // Get the DB connection
    const query = `
        SELECT b.id, b.name, b.address, IFNULL(u.user_count, 0) AS user_count
        FROM branches b
        LEFT JOIN (
            SELECT branch_id, COUNT(*) AS user_count
            FROM users
            GROUP BY branch_id
        ) u ON b.id = u.branch_id
        WHERE b.is_deleted = 0; -- Only fetch branches where is_deleted is 0 (active)
    `;

    db.query(query, (err, results) => {
        if (err) {
            console.error("Error fetching branches:", err);
            return res.status(500).json({ error: "Failed to fetch branches" });
        }

        // Log audit trail for branch fetch
        logAuditTrail(db, req.session.user.id, "SELECT", "Branches", "Fetching all active branches", {}, req.session.user.branch_id);

        res.status(200).json(results);
    });
});


// Route to get total number of branches
router.get("/total-branches", isAuthenticated("Admin"), (req, res) => {
    const db = req.app.get("db");

    const query = `
        SELECT COUNT(*) AS total_branches
        FROM branches
        where is_deleted = 0;
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
        UPDATE branches
        SET is_deleted = 1
        WHERE id = ?;
    `;

    db.query(query, [branchId], (err, result) => {
        if (err) {
            console.error("Error deleting branch:", err);
            return res.status(500).json({ success: false, message: "Failed to delete branch." });
        }

        res.status(200).json({ success: true, message: "Branch marked as deleted successfully." });
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
router.get("/inventory", isAuthenticated("Admin"), (req, res) => {
    const db = req.app.get("db");
    const { branch_id } = req.query;
    console.log("Received branch_id:", branch_id);

    // Check if branch_id is provided in the query
    if (!branch_id) {
        return res.status(400).json({ success: false, message: "Branch ID is required." });
    }

    // Query to get inventory for the given branch
    const query = `
        SELECT item, quantity, updated_at
        FROM inventory
        WHERE branch_id = ?;
    `;

    db.query(query, [branch_id], (err, results) => {
        if (err) {
            console.error("Error fetching inventory:", err);
            return res.status(500).json({ success: false, message: "Failed to fetch inventory." });
        }

        // Return the inventory data
        res.status(200).json({ success: true, inventory: results });
    });
});

router.post("/inventory", isAuthenticated("Admin"), (req, res) => {
    const { branch_id, items } = req.body; // Branch ID and items from the request

    // Validate if branch_id and items are present
    if (!branch_id || !Array.isArray(items) || items.length === 0) {
        return res.status(400).json({ success: false, message: "Invalid request. Branch ID and items are required." });
    }

    const db = req.app.get("db");

    // Loop through the items and either update or insert them in the inventory
    items.forEach(item => {
        const { item: itemName, quantity } = item; // Item name and quantity

        // Check if the item already exists for the branch
        const checkItemQuery = `
            SELECT * FROM inventory WHERE branch_id = ? AND item = ?;
        `;
        db.query(checkItemQuery, [branch_id, itemName], (err, result) => {
            if (err) {
                console.error("Error checking inventory:", err);
                return res.status(500).json({ success: false, message: "Error checking inventory." });
            }

            if (result.length > 0) {
                // Item exists, update its quantity
                const updateInventoryQuery = `
                    UPDATE inventory
                    SET quantity = quantity + ?, updated_at = NOW()
                    WHERE branch_id = ? AND item = ?;
                `;
                db.query(updateInventoryQuery, [quantity, branch_id, itemName], (err) => {
                    if (err) {
                        console.error("Error updating inventory:", err);
                        return res.status(500).json({ success: false, message: "Error updating inventory." });
                    }
                });
            } else {
                // Item doesn't exist, insert it into inventory
                const insertInventoryQuery = `
                    INSERT INTO inventory (branch_id, item, quantity)
                    VALUES (?, ?, ?);
                `;
                db.query(insertInventoryQuery, [branch_id, itemName, quantity], (err) => {
                    if (err) {
                        console.error("Error inserting inventory:", err);
                        return res.status(500).json({ success: false, message: "Error inserting inventory." });
                    }
                });
            }
        });
    });

    res.status(200).json({ success: true, message: "Inventory updated successfully!" });
});

router.get("/branches/audit-trails", isAuthenticated("Admin"), (req, res) => {
    const db = req.app.get("db");
    const { page = 1, limit = 10 } = req.query;
    const offset = (page - 1) * limit;

    const query = `
        SELECT 
            at.id, at.user_id, at.action_type, at.entity_name, at.entity_id,
            at.action_details, at.timestamp, at.branch_id, u.username
        FROM audit_trails at
        JOIN users u ON at.user_id = u.id
        ORDER BY at.timestamp DESC
        LIMIT ? OFFSET ?;
    `;

    const countQuery = `SELECT COUNT(*) AS total FROM audit_trails;`;

    db.query(query, [parseInt(limit), parseInt(offset)], (err, results) => {
        if (err) {
            console.error("Error fetching audit trails:", err);
            return res.status(500).json({ success: false, message: "Failed to fetch audit trails." });
        }

        db.query(countQuery, [], (err, countResult) => {
            if (err) {
                console.error("Error fetching audit trail count:", err);
                return res.status(500).json({ success: false, message: "Failed to fetch count." });
            }

            const totalRecords = countResult[0].total;
            res.status(200).json({
                success: true,
                auditTrails: results,
                totalPages: Math.ceil(totalRecords / limit),
            });
        });
    });
});
router.get("/unclaimed", isAuthenticated("Admin"), (req, res) => {
    const { startDate, endDate, branchId, page = 1, limit = 10, sortOption = 'created_at' } = req.query;
    const offset = (page - 1) * limit;
    const db = req.app.get("db");

    // Validate sortOption for security
    const validSortOptions = ["created_at", "paid_at"];
    if (!validSortOptions.includes(sortOption)) {
        return res.status(400).json({ success: false, message: "Invalid sort option." });
    }

    // Base query
    let query = `
        SELECT id, customer_name, number_of_loads, created_at, paid_at, claimed_at
        FROM sales_orders
        WHERE branch_id = ? AND claimed_status != 'Claimed'
    `;
    const params = [branchId];

    // Apply date filters
    if (startDate) {
        query += ` AND DATE(${sortOption}) >= ?`;
        params.push(startDate);
    }

    if (endDate) {
        query += ` AND DATE(${sortOption}) <= ?`;
        params.push(endDate);
    }

    // Apply sorting
    query += ` ORDER BY ${sortOption} DESC`;

    // Apply pagination
    query += ` LIMIT ? OFFSET ?`;
    params.push(parseInt(limit), parseInt(offset));

    // Execute the main query
    db.query(query, params, (err, result) => {
        if (err) {
            console.error("Error fetching unclaimed loads:", err);
            return res.status(500).json({ success: false, message: "Failed to fetch unclaimed loads." });
        }

        // Build the count query separately to avoid modifying the main query variable
        let countQuery = `
            SELECT COUNT(*) AS total 
            FROM sales_orders 
            WHERE branch_id = ? AND claimed_status != 'Claimed'
        `;
        const countParams = [branchId];

        // Include date filters in count query
        if (startDate) {
            countQuery += ` AND DATE(${sortOption}) >= ?`;
            countParams.push(startDate);
        }

        if (endDate) {
            countQuery += ` AND DATE(${sortOption}) <= ?`;
            countParams.push(endDate);
        }

        db.query(countQuery, countParams, (countErr, countResult) => {
            if (countErr) {
                console.error("Error fetching total count:", countErr);
                return res.status(500).json({ success: false, message: "Failed to fetch total count." });
            }

            const totalRecords = countResult[0]?.total || 0;
            res.status(200).json({
                success: true,
                transactions: result,
                totalPages: Math.ceil(totalRecords / limit),
                currentPage: parseInt(page),
            });
        });
    });
});

router.get("/report-totals", isAuthenticated("Admin"), (req, res) => {
    const db = req.app.get("db");
    const { branch_id, start_date, end_date } = req.query;

    // Validate branch_id
    if (!branch_id) {
        return res.status(400).json({ success: false, message: "Branch ID is required." });
    }

    const totalsQuery = `
        SELECT 
            SUM(CASE WHEN DATE(CONVERT_TZ(created_at, '+00:00', '+08:00')) BETWEEN ? AND ? THEN number_of_loads ELSE 0 END) AS total_sales,
            COUNT(*) AS total_transactions,
            SUM(CASE WHEN payment_status = 'Paid' AND DATE(CONVERT_TZ(paid_at, '+00:00', '+08:00')) BETWEEN ? AND ? THEN total_cost ELSE 0 END) AS total_income
        FROM sales_orders
        WHERE branch_id = ?
        AND (
            DATE(CONVERT_TZ(created_at, '+00:00', '+08:00')) BETWEEN ? AND ?
            OR DATE(CONVERT_TZ(paid_at, '+00:00', '+08:00')) BETWEEN ? AND ?
        );
    `;

    db.query(totalsQuery, [start_date, end_date, start_date, end_date, branch_id, start_date, end_date, start_date, end_date], (err, results) => {
        if (err) {
            console.error("Error fetching report totals:", err);
            return res.status(500).json({ success: false, message: "Failed to fetch report totals." });
        }

        const totals = results[0];
        res.status(200).json({
            success: true,
            total_sales: totals.total_sales || 0,       // Total sales for transactions created within the date range
            total_transactions: totals.total_transactions || 0, // Total transactions within the date range
            total_income: totals.total_income || 0,     // Total income for transactions paid within the date range
        });
    });
});

module.exports = router;
