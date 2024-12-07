const express = require("express");
const fs = require("fs");
const path = require("path");
const { PDFDocument, rgb, StandardFonts } = require("pdf-lib");
const isAuthenticated = require("../middleware/auth");
const router = express.Router();
const PRICING = {
    services: {
        Wash: 95,
        Dry: 65,
        "Wash & Dry": 130,
        "Special Service": 200,
    },
    detergentCost: 17,
    fabricSoftenerCost: 13,
    plasticFee: 3.0,
};

router.post("/process", isAuthenticated("Staff"), async (req, res) => {
    try {
        const {
            customerName,
            numberOfLoads,
            services,
            detergentCount,
            fabricSoftenerCount,
            paymentStatus,
            userId,
        } = req.body;

        const branchId = req.session.user.branch_id; // Retrieve branch_id from session
        const db = req.app.get("db");

        console.log("Received request data:", req.body);

        // Pricing structure (check if the values are correct)
        const PRICING = {
            services: {
                Wash: 95,
                Dry: 65,
                "Wash & Dry": 130,
                "Special Service": 200,
            },
            detergentCost: 17,
            fabricSoftenerCost: 13,
            plasticFee: 3.0,
        };

        const baseCost = PRICING.services[services] || 0;
        const plasticFee = 3 * numberOfLoads; 
        const totalCost =
            numberOfLoads * baseCost +
            (detergentCount || 0) * PRICING.detergentCost +
            (fabricSoftenerCount || 0) * PRICING.fabricSoftenerCost +
            plasticFee;
        
        const query = `
            INSERT INTO sales_orders (
                user_id, customer_name, number_of_loads, services,
                detergent_count, fabric_softener_count, additional_fees, total_cost,
                payment_status, branch_id, month_created, paid_at, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;

        const currentDate = new Date();
        const paidAt = paymentStatus === "Paid" ? currentDate : null; // Set paid_at if payment is made
        const createdAt = currentDate; // Use the current timestamp for created_at

        // Insert the transaction
        db.query(
            query,
            [
                userId,
                customerName,
                numberOfLoads,
                services,
                detergentCount || 0,
                fabricSoftenerCount || 0,
                PRICING.plasticFee,
                totalCost,
                paymentStatus,
                branchId,
                new Date().toLocaleString("en-US", { month: "long" }), // Month created (you can format as needed)
                paidAt,
                createdAt, // created_at is set to current timestamp
            ],
            async (err, result) => {
                if (err) {
                    console.error("Error processing transaction:", err);
                    return res.status(500).json({ success: false, message: "Failed to process transaction." });
                }

                if (paymentStatus === "Paid") {
                    try {
                        const pdf = await generateReceiptPDF({
                            customerName,
                            services,
                            numberOfLoads,
                            detergentCount,
                            fabricSoftenerCount,
                            additionalFees: PRICING.plasticFee,
                            totalCost,
                            createdAt,
                            paidAt,
                            claimedAt: null,
                        });

                        const receiptFileName = `receipt_${result.insertId || Date.now()}.pdf`;
                        const filePath = path.join(__dirname, "../receipts", receiptFileName);

                        fs.writeFileSync(filePath, pdf);

                        console.log("Receipt generated:", filePath);

                        res.status(200).json({
                            success: true,
                            message: "Transaction processed successfully.",
                            receipt: `/receipts/${receiptFileName}`,
                        });
                    } catch (err) {
                        console.error("Error generating receipt:", err);
                        return res.status(500).json({ success: false, message: "Failed to generate receipt." });
                    }
                } else {
                    res.status(200).json({ success: true, message: "Transaction saved as unpaid" });
                }

            }
        );
    } catch (err) {
        console.error("Error in processing request:", err);
        res.status(500).json({ success: false, message: "Internal server error." });
    }
});


router.get("/paid", isAuthenticated("Staff"), (req, res) => {
    const { startDate, endDate, name, page = 1, limit = 10 } = req.query;
    const offset = (page - 1) * limit;
    const db = req.app.get("db");
    const branchId = req.session.user.branch_id; // Retrieve branch_id from session

    let query = `
        SELECT * FROM sales_orders
        WHERE branch_id = ? AND payment_status = 'Paid' AND load_status = 'Completed' AND claimed_status != 'Claimed'
    `;
    const params = [branchId];

    if (startDate) {
        query += ` AND paid_at >= ?`;
        params.push(`${startDate} 00:00:00`);
    }

    if (endDate) {
        query += ` AND paid_at <= ?`;
        params.push(`${endDate} 23:59:59`);
    }

    if (name) {
        query += ` AND customer_name LIKE ?`;
        params.push(`%${name}%`);
    }

    query += ` ORDER BY paid_at DESC LIMIT ? OFFSET ?`;
    params.push(parseInt(limit), parseInt(offset));

    db.query(query, params, (err, result) => {
        if (err) {
            console.error("Error fetching paid transactions:", err);
            return res.status(500).json({ success: false, message: "Failed to fetch paid transactions." });
        }

        const countQuery = `SELECT COUNT(*) AS total FROM sales_orders WHERE branch_id = ? AND payment_status = 'Paid' AND load_status = 'Completed' AND claimed_status != 'Claimed'`;
        db.query(countQuery, [branchId], (err, countResult) => {
            if (err) {
                console.error("Error fetching total count:", err);
                return res.status(500).json({ success: false, message: "Failed to fetch total count." });
            }

            const totalRecords = countResult[0].total;
            res.status(200).json({
                success: true,
                transactions: result,
                totalPages: Math.ceil(totalRecords / limit),
            });
        });
    });
});



router.get("/unpaid", isAuthenticated("Staff"), (req, res) => {
    const db = req.app.get("db");

    const branchId = req.session.user.branch_id;

    const query = `
        SELECT * FROM sales_orders
        WHERE branch_id = ? AND payment_status = 'Unpaid'
        ORDER BY created_at DESC
    `;

    db.query(query, [branchId], (err, result) => {
        if (err) {
            console.error("Error fetching unpaid transactions:", err);
            return res.status(500).json({ success: false, message: "Failed to fetch unpaid transactions." });
        }

        res.status(200).json({ success: true, transactions: result });
    });
});

router.post("/mark-paid/:orderId", isAuthenticated("Staff"), (req, res) => {
    const { orderId } = req.params;
    const db = req.app.get("db");

    const currentTimestamp = new Date().toISOString().slice(0, 19).replace('T', ' ');

    const query = `
        UPDATE sales_orders
        SET payment_status = 'Paid', claimed_status = 'Unclaimed', paid_at = ?, is_today_transaction = 1
        WHERE id = ? AND branch_id = ?
    `;

    db.query(query, [currentTimestamp, orderId, req.session.user.branch_id], async (err, result) => {
        if (err) {
            console.error("Error updating payment status:", err);
            return res.status(500).json({ success: false, message: "Failed to update payment status." });
        }

        const orderQuery = `
            SELECT * FROM sales_orders WHERE id = ? AND branch_id = ?
        `;
        db.query(orderQuery, [orderId, req.session.user.branch_id], async (err, order) => {
            if (err || order.length === 0) {
                console.error("Error fetching order details:", err);
                return res.status(500).json({ success: false, message: "Failed to fetch order details." });
            }

            const orderData = order[0];
            try {
                const pdf = await generateReceiptPDF({
                    customerName: orderData.customer_name,
                    services: orderData.services,
                    numberOfLoads: orderData.number_of_loads,
                    detergentCount: orderData.detergent_count,
                    fabricSoftenerCount: orderData.fabric_softener_count,
                    additionalFees: Number(orderData.additional_fees),
                    totalCost: Number(orderData.total_cost),
                    createdAt: orderData.created_at,
                    paidAt: orderData.paid_at,
                    claimedAt: orderData.claimed_at,
                });

                const receiptFileName = `receipt_${orderId}.pdf`;
                const filePath = path.join(__dirname, "../receipts", receiptFileName);

                // Save the generated PDF
                fs.writeFileSync(filePath, pdf);

                res.status(200).json({
                    success: true,
                    message: "Transaction marked as paid and receipt generated.",
                    receipt: `/receipts/${receiptFileName}`,
                });
            } catch (err) {
                console.error("Error generating receipt:", err);
                return res.status(500).json({ success: false, message: "Failed to generate receipt." });
            }
        });
    });
});


router.post("/mark-claimed/:orderId", isAuthenticated("Staff"), (req, res) => {
    const { orderId } = req.params;
    const db = req.app.get("db");

    // Check if the order is paid and completed
    const checkQuery = `
        SELECT load_status, payment_status FROM sales_orders 
        WHERE id = ? AND branch_id = ?
    `;

    db.query(checkQuery, [orderId, req.session.user.branch_id], (err, result) => {
        if (err) {
            console.error("Error fetching order details:", err);
            return res.status(500).json({ success: false, message: "Failed to fetch order details." });
        }

        if (result.length === 0) {
            return res.status(404).json({ success: false, message: "Order not found." });
        }

        const order = result[0];

        // Ensure the order is completed and paid
        if (order.load_status !== "Completed" || order.payment_status !== "Paid") {
            return res.status(400).json({ success: false, message: "Order must be completed and paid before claiming." });
        }

        // Update claimed status to 'Claimed'
        const currentTimestamp = new Date().toISOString().slice(0, 19).replace('T', ' '); // YYYY-MM-DD HH:MM:SS
        const updateQuery = `
            UPDATE sales_orders
            SET claimed_status = 'Claimed', claimed_at = ?
            WHERE id = ? AND branch_id = ?
        `;

        db.query(updateQuery, [currentTimestamp, orderId, req.session.user.branch_id], (err, result) => {
            if (err) {
                console.error("Error marking order as claimed:", err);
                return res.status(500).json({ success: false, message: "Failed to mark order as claimed." });
            }

            res.status(200).json({
                success: true,
                message: "Order successfully marked as claimed.",
            });
        });
    });
});

router.get("/sales-records", isAuthenticated("Staff"), (req, res) => {
    const { search, startDate, endDate, page = 1, limit = 10, selectedDateField } = req.query;
    const offset = (page - 1) * limit;
    const db = req.app.get("db");

    const dateField = selectedDateField || "created_at"; // Default to "created_at" if not provided

    // Build the query with filters
    let query = `
        SELECT 
            id, customer_name, number_of_loads, services, 
            detergent_count, fabric_softener_count, total_cost, 
            payment_status, claimed_status, created_at, paid_at, claimed_at,
            CASE 
                WHEN ? = 'created_at' THEN DATE_FORMAT(CONVERT_TZ(created_at, '+00:00', @@session.time_zone), '%m/%d/%Y %l:%i %p')
                WHEN ? = 'paid_at' THEN IF(paid_at IS NULL, 'N/A', DATE_FORMAT(CONVERT_TZ(paid_at, '+00:00', @@session.time_zone), '%m/%d/%Y %l:%i %p'))
                WHEN ? = 'claimed_at' THEN IF(claimed_at IS NULL, 'N/A', DATE_FORMAT(CONVERT_TZ(claimed_at, '+00:00', @@session.time_zone), '%m/%d/%Y %l:%i %p'))
                ELSE 'N/A'
            END AS formatted_date_time
        FROM sales_orders
        WHERE branch_id = ? 
    `;
    const params = [selectedDateField, selectedDateField, selectedDateField, req.session.user.branch_id];

    if (search) {
        query += ` AND customer_name LIKE ?`;
        params.push(`%${search}%`);
    }

    if (startDate && endDate) {
        query += ` AND DATE(${dateField}) BETWEEN STR_TO_DATE(?, '%m/%d/%Y') AND STR_TO_DATE(?, '%m/%d/%Y')`;
        params.push(startDate, endDate);
    }

    query += ` ORDER BY ${dateField} DESC LIMIT ? OFFSET ?`;
    params.push(parseInt(limit), parseInt(offset));

    db.query(query, params, (err, result) => {
        if (err) {
            console.error("Error fetching sales records:", err);
            return res.status(500).json({ success: false, message: "Failed to fetch sales records." });
        }

        // Format date fields in the result before sending to frontend
        const formattedRecords = result.map(record => ({
            ...record,
            formatted_date_time: record.formatted_date_time || 'N/A', // Dynamically populated
        }));

        // Query to get the total number of records for pagination
        const countQuery = `SELECT COUNT(*) AS total FROM sales_orders WHERE branch_id = ?`;
        db.query(countQuery, [req.session.user.branch_id], (err, countResult) => {
            if (err) {
                console.error("Error fetching total count:", err);
                return res.status(500).json({ success: false, message: "Failed to fetch total count." });
            }

            const totalRecords = countResult[0].total;
            res.status(200).json({
                success: true,
                records: formattedRecords,
                totalPages: Math.ceil(totalRecords / limit),
            });
        });
    });
});

const generateReceiptPDF = async (data) => {
    const pdfDoc = await PDFDocument.create();
    const timesRomanFont = await pdfDoc.embedFont(StandardFonts.TimesRoman);

    const {
        customerName,
        services,
        numberOfLoads = 0,
        detergentCount = 0,
        fabricSoftenerCount = 0,
        additionalFees = 0,
        totalCost = 0,
        createdAt,
        paidAt,
        claimedAt,
    } = data;

    // Calculate plastic fee dynamically (₱3 per load)
    const plasticFee = 3 * numberOfLoads; // 3 PHP per load

    const detergentAmount = Number(detergentCount) * PRICING.detergentCost;
    const fabricSoftenerAmount = Number(fabricSoftenerCount) * PRICING.fabricSoftenerCost;

    const totalCostNumeric = Number(totalCost) || 0;

    const page = pdfDoc.addPage([400, 600]);

    // Receipt content
    page.drawText("STARWASH RECEIPT", { x: 150, y: 550, size: 16, font: timesRomanFont, color: rgb(0, 0, 0) });
    page.drawText(`Customer Name: ${customerName}`, { x: 50, y: 500, size: 12, font: timesRomanFont });
    page.drawText(`Service: ${services}`, { x: 50, y: 480, size: 12, font: timesRomanFont });
    page.drawText(`Loads (${numberOfLoads}): PHP ${Number(numberOfLoads) * PRICING.services[services]}`, {
        x: 50,
        y: 460,
        size: 12,
        font: timesRomanFont,
    });

    page.drawText(`Detergent: PHP ${detergentAmount.toFixed(2)}`, { x: 50, y: 440, size: 12, font: timesRomanFont });
    page.drawText(`Fabric Softener: PHP ${fabricSoftenerAmount.toFixed(2)}`, { x: 50, y: 420, size: 12, font: timesRomanFont });

    // Display the plastic fee (₱3 per load)
    page.drawText(`Plastic Fee: PHP ${plasticFee.toFixed(2)}`, { 
        x: 50, 
        y: 400, 
        size: 12, 
        font: timesRomanFont 
    });

    // Total cost calculation (including the dynamic plastic fee)
    page.drawText(`Total Amount: PHP ${totalCostNumeric.toFixed(2)}`, { 
        x: 50, 
        y: 380, 
        size: 14, 
        font: timesRomanFont, 
        color: rgb(1, 0, 0) 
    });

    page.drawText(`Date Created: ${new Date(createdAt).toLocaleString()}`, { x: 50, y: 360, size: 10, font: timesRomanFont });
    if (paidAt) {
        page.drawText(`Date Paid: ${new Date(paidAt).toLocaleString()}`, { x: 50, y: 340, size: 10, font: timesRomanFont });
    }
    if (claimedAt) {
        page.drawText(`Date Claimed: ${new Date(claimedAt).toLocaleString()}`, { x: 50, y: 320, size: 10, font: timesRomanFont });
    }

    return await pdfDoc.save();
};

router.get("/branch-stats", isAuthenticated("Staff"), (req, res) => {
    const db = req.app.get("db");
    const branchId = req.session.user.branch_id; // Retrieve the branch ID from session

    const query = `
        SELECT 
            branch_id,
            SUM(CASE WHEN payment_status = 'Paid' THEN total_cost ELSE 0 END) AS total_income,
            SUM(CASE WHEN DATE(CONVERT_TZ(created_at, '+00:00', '+08:00')) = CURDATE() THEN number_of_loads ELSE 0 END) AS total_sales
        FROM sales_orders
        WHERE branch_id = ?
        AND (
            DATE(CONVERT_TZ(paid_at, '+00:00', '+08:00')) = CURDATE()
            OR DATE(CONVERT_TZ(created_at, '+00:00', '+08:00')) = CURDATE()
        )
        GROUP BY branch_id;
    `;

    db.query(query, [branchId], (err, result) => {
        if (err) {
            console.error("Error fetching branch stats:", err);
            return res.status(500).json({ success: false, message: "Failed to fetch branch stats." });
        }

        const stats = {
            totalIncome: result[0]?.total_income || 0, // Total income for paid transactions today
            totalSales: result[0]?.total_sales || 0,   // Total loads for today's transactions
        };

        res.status(200).json({ success: true, stats });
    });
});

router.get("/load-status", isAuthenticated("Staff"), (req, res) => {
    const db = req.app.get("db");
    const branchId = req.session.user.branch_id;

    const query = `
        SELECT id, customer_name, number_of_loads, created_at, load_status
        FROM sales_orders
        WHERE branch_id = ? AND load_status != 'Completed'
        ORDER BY created_at DESC
    `;

    db.query(query, [branchId], (err, result) => {
        if (err) {
            console.error("Error fetching load status:", err);
            return res.status(500).json({ success: false, message: "Failed to fetch load statuses." });
        }

        res.status(200).json({ success: true, loadStatus: result });
    });
});


router.post("/update-load-status/:orderId", isAuthenticated("Staff"), (req, res) => {
    const { orderId } = req.params;
    const { load_status } = req.body;
    const db = req.app.get("db");

    if (!["Pending", "Ongoing", "Completed"].includes(load_status)) {
        return res.status(400).json({ success: false, message: "Invalid load status." });
    }

    const query = `
        UPDATE sales_orders
        SET load_status = ?
        WHERE id = ? AND branch_id = ?
    `;

    db.query(query, [load_status, orderId, req.session.user.branch_id], (err, result) => {
        if (err) {
            console.error("Error updating load status:", err);
            return res.status(500).json({ success: false, message: "Failed to update load status." });
        }

        res.status(200).json({
            success: true,
            message: `Load status updated to ${load_status}.`,
        });
    });
});
router.delete("/delete-transaction/:orderId", isAuthenticated("Staff"), (req, res) => {
    const { orderId } = req.params;
    const db = req.app.get("db");

    const query = `
        DELETE FROM sales_orders
        WHERE id = ? AND payment_status = 'Unpaid' AND load_status = 'Pending';
    `;

    db.query(query, [orderId], (err, result) => {
        if (err) {
            console.error("Error deleting transaction:", err);
            return res.status(500).json({ success: false, message: "Failed to delete transaction." });
        }

        if (result.affectedRows > 0) {
            res.status(200).json({ success: true, message: "Transaction deleted successfully." });
        } else {
            res.status(400).json({ success: false, message: "Cannot delete this transaction. Only unpaid and pending transactions can be deleted." });
        }
    });
});

router.get("/todays-transactions", isAuthenticated("Staff"), (req, res) => {
    const { page = 1, limit = 5 } = req.query;
    const offset = (page - 1) * limit;
    const db = req.app.get("db");
    const branchId = req.session.user.branch_id;

    const query = `
        SELECT * FROM sales_orders
        WHERE branch_id = ? AND DATE(CONVERT_TZ(created_at, '+00:00', '+08:00')) = CURDATE()
        LIMIT ? OFFSET ?;
    `;
    const params = [branchId, parseInt(limit), parseInt(offset)];

    db.query(query, params, (err, result) => {
        if (err) {
            console.error("Error fetching transactions:", err);
            return res.status(500).json({ success: false, message: "Failed to fetch transactions." });
        }

        const countQuery = `
            SELECT COUNT(*) AS total FROM sales_orders
            WHERE branch_id = ? AND DATE(CONVERT_TZ(created_at, '+00:00', '+08:00')) = CURDATE();
        `;
        db.query(countQuery, [branchId], (err, countResult) => {
            if (err) {
                console.error("Error fetching total count:", err);
                return res.status(500).json({ success: false, message: "Failed to fetch total count." });
            }

            const totalRecords = countResult[0].total;
            const totalPages = Math.ceil(totalRecords / limit); // Calculate total pages

            res.status(200).json({
                success: true,
                transactions: result,
                totalPages: totalPages, // Include totalPages in the response
            });
        });
    });
});

router.get("/:orderId", isAuthenticated("Staff"), (req, res) => {
    const { orderId } = req.params;
    const db = req.app.get("db");

    const query = `SELECT * FROM sales_orders WHERE id = ?`;
    db.query(query, [orderId], (err, result) => {
        if (err || result.length === 0) {
            console.error("Error fetching transaction:", err);
            return res.status(500).json({ success: false, message: "Transaction not found." });
        }
        res.status(200).json({ success: true, transaction: result[0] });
    });
});

router.post("/update/:orderId", isAuthenticated("Staff"), async (req, res) => {
    const { orderId } = req.params;
    const { customer_name, services, number_of_loads, fabric_softener_count, detergent_count, payment_status } = req.body;
    const db = req.app.get("db");

    const query = `
        UPDATE sales_orders
        SET customer_name = ?, services = ?, number_of_loads = ?, fabric_softener_count = ?, detergent_count = ?, payment_status = ?
        WHERE id = ?;
    `;

    db.query(
        query,
        [customer_name, services, number_of_loads, fabric_softener_count, detergent_count, payment_status, orderId],
        async (err, result) => {
            if (err) {
                console.error("Error updating transaction:", err);
                return res.status(500).json({ success: false, message: "Failed to update transaction." });
            }

            if (payment_status === "Paid") {
                // Fetch updated transaction for receipt generation
                const fetchQuery = `SELECT * FROM sales_orders WHERE id = ?`;
                db.query(fetchQuery, [orderId], async (fetchErr, fetchResult) => {
                    if (fetchErr || fetchResult.length === 0) {
                        console.error("Error fetching updated transaction:", fetchErr);
                        return res.status(500).json({ success: false, message: "Failed to fetch transaction details." });
                    }

                    const transaction = fetchResult[0];
                    try {
                        const receipt = await generateReceiptPDF({
                            customerName: transaction.customer_name,
                            services: transaction.services,
                            numberOfLoads: transaction.number_of_loads,
                            detergentCount: transaction.detergent_count,
                            fabricSoftenerCount: transaction.fabric_softener_count,
                            additionalFees: transaction.additional_fees,
                            totalCost: transaction.total_cost,
                            createdAt: transaction.created_at,
                            paidAt: new Date(), // Set paidAt to current timestamp
                            claimedAt: transaction.claimed_at,
                        });

                        const receiptFileName = `receipt_${orderId}.pdf`;
                        const filePath = path.join(__dirname, "../receipts", receiptFileName);
                        fs.writeFileSync(filePath, receipt);

                        return res.status(200).json({
                            success: true,
                            message: "Transaction updated and receipt generated.",
                            receipt: `/receipts/${receiptFileName}`,
                        });
                    } catch (err) {
                        console.error("Error generating receipt:", err);
                        return res.status(500).json({ success: false, message: "Failed to generate receipt." });
                    }
                });
            } else {
                res.status(200).json({ success: true, message: "Transaction updated successfully." });
            }
        }
    );
});

// Add a new request
router.post("/requests/create", (req, res) => {
    const { branch_id, item_name, quantity } = req.body;
    const db = req.app.get('db');
    const query = `
        INSERT INTO requests (branch_id, item_name, quantity, status)
        VALUES (?, ?, ?, 'Pending');
    `;

    db.query(query, [branch_id, item_name, quantity], (err, result) => {
        if (err) {
            console.error("Error creating request:", err);
            return res.status(500).json({ success: false, error: "Failed to create request." });
        }
        res.json({ success: true, message: "Request created successfully." });
    });
});

router.get("/requests/list", (req, res) => {
    const branch_id = req.query.branch_id;  // Assuming branch_id is passed in the query params
const db = req.app.get('db');
    const query = `
        SELECT item_name, quantity, status 
        FROM requests 
        WHERE branch_id = ? 
        ORDER BY created_at DESC;
    `;

    db.query(query, [branch_id], (err, results) => {
        if (err) {
            console.error("Error fetching requests:", err);
            return res.status(500).json({ success: false, error: "Failed to fetch requests." });
        }
        res.json({ success: true, requests: results });
    });
});
module.exports = router;