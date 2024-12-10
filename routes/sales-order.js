const express = require("express");
const fs = require("fs");
const path = require("path");
const logAuditTrail = require("../utils/logAuditTrail");
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

router.post("/process", isAuthenticated("Staff"), (req, res) => {
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
    const db = req.app.get("db"); // Access the database

    console.log("Received request data:", req.body);

    // Pricing structure
    const PRICING = {
        services: {
            Wash: 95,
            Dry: 65,
            "Wash & Dry": 130,
            "Special Service": 200,
        },
        detergentCost: 17,
        fabricSoftenerCost: 13,
        plasticFeePerLoad: 3.0, // plastic fee per load
    };

    const baseCost = PRICING.services[services] || 0;
    const plasticFee = PRICING.plasticFeePerLoad * numberOfLoads; // Cost for plastic
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

    // Insert the transaction into sales_orders table
    db.query(
        query,
        [
            userId,
            customerName,
            numberOfLoads,
            services,
            detergentCount || 0,
            fabricSoftenerCount || 0,
            PRICING.plasticFeePerLoad,
            totalCost,
            paymentStatus,
            branchId,
            new Date().toLocaleString("en-US", { month: "long" }),
            paidAt,
            createdAt,
        ],
        (err, result) => {
            if (err) {
                console.error("Error processing transaction:", err);
                return res.status(500).json({ success: false, message: "Failed to process transaction." });
            }

            const salesOrderId = result.insertId;

            // **Log Audit Trail for Sales Order Creation**
            logAuditTrail(db, userId, "INSERT", "sales_orders", salesOrderId, {
                customerName,
                numberOfLoads,
                services,
                detergentCount,
                fabricSoftenerCount,
                totalCost,
                paymentStatus,
            }, branchId);

            // Prepare inventory update queries
            const updateInventoryQueries = [
                {
                    query: `
                        UPDATE inventory
                        SET quantity = quantity - ?, updated_at = NOW()
                        WHERE branch_id = ? AND item = 'Detergent';
                    `,
                    params: [detergentCount, branchId],
                    item: "Detergent",
                },
                {
                    query: `
                        UPDATE inventory
                        SET quantity = quantity - ?, updated_at = NOW()
                        WHERE branch_id = ? AND item = 'Fabric Softener';
                    `,
                    params: [fabricSoftenerCount, branchId],
                    item: "Fabric Softener",
                },
                {
                    query: `
                        UPDATE inventory
                        SET quantity = quantity - ?, updated_at = NOW()
                        WHERE branch_id = ? AND item = 'Plastic';
                    `,
                    params: [numberOfLoads, branchId],
                    item: "Plastic",
                },
            ];

            // Prepare action details to log all inventory updates in a single entry
            const inventoryChanges = updateInventoryQueries.map(query => ({
                item: query.item,
                deducted: query.params[0], // Amount deducted for each item
            }));

            // Execute inventory update queries
            const executeQueries = (queries, callback) => {
                if (queries.length === 0) return callback();
                const { query, params } = queries.shift();

                db.query(query, params, (err) => {
                    if (err) return callback(err);
                    executeQueries(queries, callback);
                });
            };

            executeQueries(updateInventoryQueries, (err) => {
                if (err) {
                    console.error("Error deducting inventory:", err);
                    return res.status(500).json({ success: false, message: "Failed to update inventory." });
                }

                // **Log Single Audit Trail for All Inventory Updates**
                logAuditTrail(db, userId, "UPDATE", "inventory", "Inventory", {
                    changes: inventoryChanges,  // Log all inventory changes in a single entry
                    branchId,
                }, branchId);

                // If payment is successful, generate receipt
                if (paymentStatus === "Paid") {
                    const receiptFileName = `receipt_${salesOrderId || Date.now()}.pdf`;
                    const filePath = path.join(__dirname, "../receipts", receiptFileName);

                    // Generate PDF for receipt
                    generateReceiptPDF({
                        customerName,
                        services,
                        numberOfLoads,
                        detergentCount,
                        fabricSoftenerCount,
                        additionalFees: PRICING.plasticFeePerLoad,
                        totalCost,
                        createdAt,
                        paidAt,
                        claimedAt: null,
                    })
                        .then((pdf) => {
                            fs.writeFileSync(filePath, pdf); // Write PDF to the file system
                            console.log("Receipt generated:", filePath);

                            // Store the receipt URL in the database
                            const generateReceiptQuery = `
                                INSERT INTO receipts (sales_order_id, receipt_url)
                                VALUES (?, ?)
                            `;
                            db.query(generateReceiptQuery, [salesOrderId, `/receipts/${receiptFileName}`], (err) => {
                                if (err) {
                                    console.error("Error storing receipt:", err);
                                    return res
                                        .status(500)
                                        .json({ success: false, message: "Failed to store receipt." });
                                }

                                // **Log Audit Trail for Receipt Generation**
                                logAuditTrail(db, userId, "INSERT", "receipts", salesOrderId, {
                                    receiptUrl: `/receipts/${receiptFileName}`,
                                }, branchId);

                                // Return success response
                                res.status(200).json({
                                    success: true,
                                    message: "Transaction processed successfully.",
                                    receipt: `/receipts/${receiptFileName}`,
                                });
                            });
                        })
                        .catch((err) => {
                            console.error("Error generating receipt:", err);
                            return res.status(500).json({ success: false, message: "Failed to generate receipt." });
                        });
                } else {
                    res.status(200).json({ success: true, message: "Transaction saved as unpaid" });
                }
            });
        }
    );
});

router.get("/paid", isAuthenticated("Staff"), (req, res) => {
    const { startDate, endDate, name, page = 1, limit = 10 } = req.query;
    const offset = (page - 1) * limit;
    const db = req.app.get("db");
    const branchId = req.session.user.branch_id;

    // Start building the query
    let query = `
        SELECT * FROM sales_orders
        WHERE branch_id = ? 
        AND payment_status = 'Paid' 
        AND load_status = 'Completed' 
        AND claimed_status != 'Claimed'
    `;
    const params = [branchId];

    // Apply date filters if provided
    if (startDate) {
        console.log("Start Date:", startDate); // Debugging
        // Ensure startDate is in 'YYYY-MM-DD' format
        query += ` AND DATE(CONVERT_TZ(paid_at, '+00:00', '+08:00')) >= ?`;
        params.push(startDate); // Assuming startDate is already in 'YYYY-MM-DD' format
    }

    if (endDate) {
        console.log("End Date:", endDate); // Debugging
        // Ensure endDate is in 'YYYY-MM-DD' format
        query += ` AND DATE(CONVERT_TZ(paid_at, '+00:00', '+08:00')) <= ?`;
        params.push(endDate); // Assuming endDate is already in 'YYYY-MM-DD' format
    }

    // Apply customer name filter if provided
    if (name) {
        console.log("Customer Name Filter:", name); // Debugging
        query += ` AND customer_name LIKE ?`;
        params.push(`%${name}%`);
    }

    // Apply pagination
    query += ` ORDER BY paid_at DESC LIMIT ? OFFSET ?`;
    params.push(parseInt(limit), parseInt(offset));

    // Execute the main query to fetch filtered records
    db.query(query, params, (err, result) => {
        if (err) {
            console.error("Error fetching paid transactions:", err);
            return res.status(500).json({ success: false, message: "Failed to fetch paid transactions." });
        }

        // Log the audit trail for the filtering operation
        logAuditTrail(db, req.session.user.id, "SELECT", "Paid Transactions", "Viewing Paid Transactions", {
            filters: { startDate, endDate, name },
            page,
            limit,
        }, branchId);

        // Query to count total records for pagination
        const countQuery = `
            SELECT COUNT(*) AS total 
            FROM sales_orders 
            WHERE branch_id = ? 
            AND payment_status = 'Paid' 
            AND load_status = 'Completed' 
            AND claimed_status != 'Claimed'
        `;
        db.query(countQuery, [branchId], (err, countResult) => {
            if (err) {
                console.error("Error fetching total count:", err);
                return res.status(500).json({ success: false, message: "Failed to fetch total count." });
            }

            const totalRecords = countResult[0]?.total || 0;
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

        // **Log Audit Trail for Unpaid Transactions Fetch**
        logAuditTrail(db, req.session.user.id, "SELECT", "sales_orders", "Unpaid Transactions", {
            branchId,
        }, branchId);

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

        // **Log Audit Trail for Marking Order as Paid**
        logAuditTrail(db, req.session.user.id, "UPDATE", "Sales Order", orderId, {
            paymentStatus: "Paid",
            orderId,
        }, req.session.user.branch_id);

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
        WHERE id = ? AND branch_id = ?;
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
            WHERE id = ? AND branch_id = ?;
        `;

        db.query(updateQuery, [currentTimestamp, orderId, req.session.user.branch_id], (err, result) => {
            if (err) {
                console.error("Error marking order as claimed:", err);
                return res.status(500).json({ success: false, message: "Failed to mark order as claimed." });
            }

            // **Log Audit Trail for Marking Order as Claimed**
            logAuditTrail(db, req.session.user.id, "UPDATE", "Sales Order", orderId, {
                claimedStatus: "Claimed",
                orderId,
                claimedAt: currentTimestamp,
            }, req.session.user.branch_id);

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

    const dateField = selectedDateField || "created_at"; // Default to "created_at" field

    // Build the query with filters
    let query = `
        SELECT 
            id, customer_name, number_of_loads, services, 
            detergent_count, fabric_softener_count, total_cost, 
            payment_status, claimed_status, created_at, paid_at, claimed_at,
            CASE 
                WHEN ? = 'created_at' THEN DATE_FORMAT(CONVERT_TZ(created_at, '+08:00', @@session.time_zone), '%m/%d/%Y %l:%i %p')
                WHEN ? = 'paid_at' THEN IF(paid_at IS NULL, 'N/A', DATE_FORMAT(CONVERT_TZ(paid_at, '+08:00', @@session.time_zone), '%m/%d/%Y %l:%i %p'))
                WHEN ? = 'claimed_at' THEN IF(claimed_at IS NULL, 'N/A', DATE_FORMAT(CONVERT_TZ(claimed_at, '+08:00', @@session.time_zone), '%m/%d/%Y %l:%i %p'))
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
        query += ` AND DATE(${dateField}) BETWEEN ? AND ?`;
        params.push(startDate, endDate);
    }

    query += ` ORDER BY ${dateField} DESC LIMIT ? OFFSET ?`;
    params.push(parseInt(limit), parseInt(offset));

    db.query(query, params, (err, result) => {
        if (err) {
            console.error("Error fetching sales records:", err);
            return res.status(500).json({ success: false, message: "Failed to fetch sales records." });
        }

        // **Log Audit Trail for Fetching Sales Records**
        logAuditTrail(db, req.session.user.id, "SELECT", "sales_orders", "Sales Records Fetch", {
            filters: { search, startDate, endDate },
            page,
            limit,
        }, req.session.user.branch_id);

        // Query to get the total number of records for pagination
        const countQuery = `SELECT COUNT(*) AS total FROM sales_orders WHERE branch_id = ?`;
        db.query(countQuery, [req.session.user.branch_id], (err, countResult) => {
            if (err) {
                console.error("Error fetching total count:", err);
                return res.status(500).json({ success: false, message: "Failed to fetch total count." });
            }

            const totalRecords = countResult[0]?.total || 0;
            res.status(200).json({
                success: true,
                records: result,
                totalPages: Math.ceil(totalRecords / limit),
                currentPage: parseInt(page),
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
            SUM(CASE WHEN payment_status = 'Paid' AND DATE(CONVERT_TZ(paid_at, '+00:00', '+08:00')) = CURDATE() THEN total_cost ELSE 0 END) AS total_income,
            SUM(CASE WHEN DATE(CONVERT_TZ(created_at, '+00:00', '+08:00')) = CURDATE() THEN number_of_loads ELSE 0 END) AS total_sales
        FROM sales_orders
        WHERE branch_id = ?
        AND (
            DATE(CONVERT_TZ(created_at, '+00:00', '+08:00')) = CURDATE()
            OR DATE(CONVERT_TZ(paid_at, '+00:00', '+08:00')) = CURDATE()
        )
        GROUP BY branch_id;
    `;

    db.query(query, [branchId], (err, result) => {
        if (err) {
            console.error("Error fetching branch stats:", err);
            return res.status(500).json({ success: false, message: "Failed to fetch branch stats." });
        }

        const stats = {
            totalIncome: result[0]?.total_income || 0, // Total income for today's paid transactions
            totalSales: result[0]?.total_sales || 0,   // Total sales for transactions created today
        };

        // Log audit trail for branch stats fetch
        logAuditTrail(db, req.session.user.id, "SELECT", "Branch Stats", "Fetching Branch Stats", {
            branchId,
            stats,
        }, branchId);

        res.status(200).json({ success: true, stats });
    });
});



router.get("/load-status", isAuthenticated("Staff"), (req, res) => {
    const db = req.app.get("db");
    const branchId = req.session.user.branch_id;
    const { page = 1, limit = 5 } = req.query;
    const offset = (page - 1) * limit;

    const query = `
        SELECT id, customer_name, number_of_loads, created_at, load_status
        FROM sales_orders
        WHERE branch_id = ? AND load_status != 'Completed'
        ORDER BY created_at DESC
        LIMIT ? OFFSET ?;
    `;
    db.query(query, [branchId, parseInt(limit), parseInt(offset)], (err, result) => {
        if (err) {
            console.error("Error fetching load status:", err);
            return res.status(500).json({ success: false, message: "Failed to fetch load statuses." });
        }

        // Query to get the total count for pagination
        const countQuery = `
            SELECT COUNT(*) AS total
            FROM sales_orders
            WHERE branch_id = ? AND load_status != 'Completed';
        `;
        db.query(countQuery, [branchId], (countErr, countResult) => {
            if (countErr) {
                console.error("Error fetching total count:", countErr);
                return res.status(500).json({ success: false, message: "Failed to fetch total count." });
            }

            const totalRecords = countResult[0]?.total || 0;
            const totalPages = Math.ceil(totalRecords / limit);

            res.status(200).json({
                success: true,
                loadStatus: result,
                totalPages: totalPages,  // Include totalPages in the response
            });
        });
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

        // **Log Audit Trail for Updating Load Status**
        logAuditTrail(db, req.session.user.id, "UPDATE", "Sales Order", orderId, {
            loadStatus: load_status,
            orderId,
        }, req.session.user.branch_id);

        res.status(200).json({
            success: true,
            message: `Load status updated to ${load_status}.`,
        });
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

            // **Log Audit Trail for Today's Transactions Fetch**
            logAuditTrail(db, req.session.user.id, "SELECT", "Today's Transactions", "Fetching Today's Transactions", {
                branchId,
                filters: { page, limit },
            }, branchId);

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
    const {
        customer_name,
        services,
        number_of_loads,
        fabric_softener_count,
        detergent_count,
        payment_status,
    } = req.body;

    const db = req.app.get("db");
    const branchId = req.session.user.branch_id;

    // Fetch the existing transaction details
    const fetchOldTransactionQuery = `
        SELECT number_of_loads, detergent_count, fabric_softener_count, total_cost, payment_status, paid_at, services
        FROM sales_orders WHERE id = ? AND branch_id = ?;
    `;

    db.query(fetchOldTransactionQuery, [orderId, branchId], (err, oldResults) => {
        if (err || oldResults.length === 0) {
            console.error("Error fetching old transaction details:", err);
            return res.status(500).json({ success: false, message: "Transaction not found." });
        }

        const oldTransaction = oldResults[0];
        const loadDiff = number_of_loads - oldTransaction.number_of_loads;
        const detergentDiff = detergent_count - oldTransaction.detergent_count;
        const softenerDiff = fabric_softener_count - oldTransaction.fabric_softener_count;

        // Calculate the new total cost
        const pricing = {
            Wash: 95,
            Dry: 65,
            "Wash & Dry": 130,
            "Special Service": 200,
            detergentCost: 17,
            fabricSoftenerCost: 13,
            plasticFee: 3.0,
        };

        const baseCost = pricing[services] || 0;
        const plasticFee = pricing.plasticFee * number_of_loads;
        const newTotalCost =
            number_of_loads * baseCost +
            (detergent_count || 0) * pricing.detergentCost +
            (fabric_softener_count || 0) * pricing.fabricSoftenerCost +
            plasticFee;

        // Update the sales_orders table
        const updateTransactionQuery = `
            UPDATE sales_orders
            SET customer_name = ?, services = ?, number_of_loads = ?, fabric_softener_count = ?, detergent_count = ?, payment_status = ?, total_cost = ?, paid_at = ?
            WHERE id = ? AND branch_id = ?;
        `;
        
        // Set paid_at to the current time when payment status is 'Paid'
        const paidAt = payment_status === "Paid" ? new Date().toISOString().slice(0, 19).replace('T', ' ') : oldTransaction.paid_at;

        db.query(
            updateTransactionQuery,
            [customer_name, services, number_of_loads, fabric_softener_count, detergent_count, payment_status, newTotalCost, paidAt, orderId, branchId],
            (err) => {
                if (err) {
                    console.error("Error updating transaction:", err);
                    return res.status(500).json({ success: false, message: "Failed to update transaction." });
                }

                // Update inventory based on the differences
                const inventoryUpdates = [
                    { item: "Detergent", diff: detergentDiff },
                    { item: "Fabric Softener", diff: softenerDiff },
                    { item: "Plastic", diff: loadDiff },
                ];

                inventoryUpdates.forEach(({ item, diff }) => {
                    if (diff !== 0) {
                        const updateInventoryQuery = `
                            UPDATE inventory
                            SET quantity = quantity - ?, updated_at = NOW()
                            WHERE branch_id = ? AND item = ?;
                        `;
                        db.query(updateInventoryQuery, [diff, branchId, item], (err) => {
                            if (err) console.error(`Failed to update ${item} inventory:`, err);
                        });
                    }
                });

                // Fetch updated stats for total income and sales
                const fetchBranchStatsQuery = `
                    SELECT 
                        SUM(CASE WHEN payment_status = 'Paid' THEN total_cost ELSE 0 END) AS total_income,
                        SUM(CASE WHEN DATE(CONVERT_TZ(created_at, '+00:00', '+08:00')) = CURDATE() THEN number_of_loads ELSE 0 END) AS total_sales
                    FROM sales_orders
                    WHERE branch_id = ?;
                `;

                db.query(fetchBranchStatsQuery, [branchId], (statsErr, statsResults) => {
                    if (statsErr) {
                        console.error("Failed to fetch branch stats:", statsErr);
                    }

                    if (payment_status === "Paid") {
                        // Generate receipt for paid transactions
                        const fetchUpdatedTransactionQuery = `
                            SELECT * FROM sales_orders WHERE id = ? AND branch_id = ?;
                        `;
                        db.query(fetchUpdatedTransactionQuery, [orderId, branchId], async (fetchErr, fetchResults) => {
                            if (fetchErr || fetchResults.length === 0) {
                                console.error("Error fetching updated transaction:", fetchErr);
                                return res.status(500).json({ success: false, message: "Failed to fetch transaction details." });
                            }

                            const transaction = fetchResults[0];
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
                                    stats: statsResults[0], // Updated stats
                                });
                            } catch (err) {
                                console.error("Error generating receipt:", err);
                                return res.status(500).json({ success: false, message: "Failed to generate receipt." });
                            }
                        });
                    } else {
                        res.status(200).json({
                            success: true,
                            message: "Transaction updated successfully.",
                            stats: statsResults[0], // Updated stats
                        });
                    }
                });
            }
        );
    });
});

router.delete("/delete-transaction/:orderId", isAuthenticated("Staff"), (req, res) => {
    const { orderId } = req.params;
    const db = req.app.get("db");
    const branchId = req.session.user.branch_id;

    // Fetch the transaction details before deletion
    const fetchTransactionQuery = `
        SELECT number_of_loads, detergent_count, fabric_softener_count
        FROM sales_orders
        WHERE id = ? AND branch_id = ?;
    `;
    db.query(fetchTransactionQuery, [orderId, branchId], (err, transactionResults) => {
        if (err || transactionResults.length === 0) {
            console.error("Error fetching transaction for deletion:", err);
            return res.status(500).json({ success: false, message: "Transaction not found." });
        }

        const transaction = transactionResults[0];

        // Delete the transaction
        const deleteQuery = `
            DELETE FROM sales_orders WHERE id = ? AND branch_id = ?;
        `;
        db.query(deleteQuery, [orderId, branchId], (deleteErr) => {
            if (deleteErr) {
                console.error("Error deleting transaction:", deleteErr);
                return res.status(500).json({ success: false, message: "Failed to delete transaction." });
            }

            // Restore inventory based on the deleted transaction
            const inventoryUpdates = [
                { item: "Detergent", diff: transaction.detergent_count },
                { item: "Fabric Softener", diff: transaction.fabric_softener_count },
                { item: "Plastic", diff: transaction.number_of_loads },
            ];

            inventoryUpdates.forEach(({ item, diff }) => {
                const updateInventoryQuery = `
                    UPDATE inventory
                    SET quantity = quantity + ?, updated_at = NOW()
                    WHERE branch_id = ? AND item = ?;
                `;
                db.query(updateInventoryQuery, [diff, branchId, item], (err) => {
                    if (err) console.error(`Failed to restore ${item} inventory:`, err);
                });
            });

            // Return success response
            res.status(200).json({ success: true, message: "Transaction deleted and inventory restored." });
        });
    });
});



router.get("/inventory/:branchId", isAuthenticated("Staff"), (req, res) => {
    const db = req.app.get("db");
    const { branchId } = req.params;

    if (!branchId) {
        return res.status(400).json({ success: false, message: "Branch ID is required." });
    }

    // Query to fetch inventory data for the user's branch
    const query = `
        SELECT item, quantity, updated_at
        FROM inventory
        WHERE branch_id = ?;
    `;

    db.query(query, [branchId], (err, results) => {
        if (err) {
            console.error("Error fetching inventory:", err);
            return res.status(500).json({ success: false, message: "Failed to fetch inventory." });
        }

        // **Log Audit Trail for Inventory Fetch**
        logAuditTrail(db, req.session.user.id, "SELECT", "Inventory", "Fetching Inventory Data", {
            branchId,
        }, branchId);

        res.status(200).json({ success: true, inventory: results });
    });
});


module.exports = router;