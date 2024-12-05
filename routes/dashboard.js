const express = require('express');
const router = express.Router();
const isAuthenticated = require('../middleware/auth'); // Adjust this path if necessary

// Route for today's income (updated)
router.get('/dashboard/today-income', isAuthenticated("Admin"), (req, res) => {
    const db = req.app.get('db');

    // Query to get today's total income including all paid orders of the current day
    const query = `
        SELECT SUM(total_cost) AS today_income
        FROM sales_orders
        WHERE DATE(CONVERT_TZ(paid_at, '+00:00', '+08:00')) = CURDATE() AND payment_status = 'Paid'
    `;

    db.query(query, (err, results) => {
        if (err) {
            console.error("Error fetching today's income:", err);
            return res.status(500).json({ error: "Failed to fetch today's income." });
        }

        res.status(200).json({ success: true, today_income: results[0]?.today_income || 0 });
    });
});

// Route for total sales (updated)
router.get('/dashboard-total-sales', isAuthenticated("Admin"), (req, res) => {
    const db = req.app.get('db');

    // Query to get total sales for today, including unpaid and paid transactions
    const query = `
        SELECT SUM(number_of_loads) AS total_sales
        FROM sales_orders
        WHERE DATE(CONVERT_TZ(created_at, '+00:00', '+08:00')) = CURDATE()
    `;

    db.query(query, (err, results) => {
        if (err) {
            console.error("Error fetching today's total sales:", err);
            return res.status(500).json({ error: "Failed to fetch today's total sales." });
        }

        res.status(200).json({ success: true, total_sales: results[0]?.total_sales || 0 });
    });
});

// Route for dashboard stats (updated)
router.get("/dashboard-stats", isAuthenticated("Admin"), (req, res) => {
    const db = req.app.get('db');

    db.query(`
        SELECT 
            MONTH(created_at) AS month,
            SUM(total_cost) AS total_income
        FROM sales_orders
        WHERE YEAR(created_at) = YEAR(CURRENT_DATE)
        AND payment_status = 'Paid'
        GROUP BY MONTH(created_at)
        ORDER BY month;
    `, (err, incomeResults) => {
        if (err) {
            console.error("Error fetching actual income:", err);
            return res.status(500).json({ error: "Failed to fetch actual income." });
        }

        db.query(`
            SELECT 
                MONTH(created_at) AS month,
                SUM(total_cost) AS expected_income
            FROM sales_orders
            WHERE YEAR(created_at) = YEAR(CURRENT_DATE)
            GROUP BY MONTH(created_at)
            ORDER BY month;
        `, (err, expectedIncomeResults) => {
            if (err) {
                console.error("Error fetching expected income:", err);
                return res.status(500).json({ error: "Failed to fetch expected income." });
            }

            db.query(`
                SELECT 
                    MONTH(created_at) AS month,
                    SUM(number_of_loads) AS total_sales
                FROM sales_orders
                WHERE YEAR(created_at) = YEAR(CURRENT_DATE)
                GROUP BY MONTH(created_at)
                ORDER BY month;
            `, (err, salesResults) => {
                if (err) {
                    console.error("Error fetching total sales:", err);
                    return res.status(500).json({ error: "Failed to fetch total sales." });
                }

                const stats = Array.from({ length: 12 }, () => ({
                    income: 0,
                    expected_income: 0,
                    deducted_amount: 0,
                    sales: 0
                }));

                incomeResults.forEach(row => {
                    stats[row.month - 1].income = row.total_income || 0;
                });

                expectedIncomeResults.forEach(row => {
                    stats[row.month - 1].expected_income = row.expected_income || 0;
                });

                salesResults.forEach(row => {
                    stats[row.month - 1].sales = row.total_sales || 0;
                });

                stats.forEach(stat => {
                    stat.deducted_amount = stat.expected_income - stat.income;
                });

                res.status(200).json({ success: true, stats });
            });
        });
    });
});

module.exports = router;
