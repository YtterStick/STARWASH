const logAuditTrail = (db, userId, actionType, entityName, entityId, actionDetails, branchId) => {
    const query = `
        INSERT INTO audit_trails (user_id, action_type, entity_name, entity_id, action_details, branch_id)
        VALUES (?, ?, ?, ?, ?, ?)
    `;

    // Allow branchId to be null in the database
    db.query(
        query,
        [userId, actionType, entityName, entityId, JSON.stringify(actionDetails), branchId || null],
        (err) => {
            if (err) {
                console.error("Failed to log audit trail:", err);
            }
        }
    );
};

module.exports = logAuditTrail;
