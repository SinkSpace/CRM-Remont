const pool = require('../db');

async function query(data) {
    const company = data;
    return await pool.query(
        `SELECT
            l.id,
            l.user_id,
            l.entity_type,
            l.entity_id,
            l.action,
            l.title,
            l.details,
            l.created_at,
            u.email,
            p.display_name
        FROM logs l
        LEFT JOIN users u ON u.id = l.user_id
        LEFT JOIN user_profiles p ON p.user_id = l.user_id
        WHERE l.company_id = $1
        ORDER BY l.created_at DESC, l.id DESC`,
        [company]
    );
}

module.exports = query;