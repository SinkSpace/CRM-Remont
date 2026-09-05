const pool = require('../db');

async function writeLog({
    company_id,
    user_id = null,
    entity_type,
    entity_id = null,
    action,
    title,
    details = null
}) {
    try {
        await pool.query(
            `INSERT INTO logs (company_id, user_id, entity_type, entity_id, action, title, details)
             VALUES ($1, $2, $3, $4, $5, $6, $7)`,
            [
                company_id,
                user_id,
                entity_type,
                entity_id,
                action,
                title,
                details ? JSON.stringify(details) : null
            ]
        );
    } catch (error) {
        console.error('Ошибка записи лога:', error);
    }
}

module.exports = writeLog;