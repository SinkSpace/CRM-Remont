const pool = require('../db');

async function contact(data) {
    const { company, q } = data;
    return await pool.query(
        `SELECT id, customer_name, phone, phone_normalized, last_used_at
            FROM contacts
            WHERE company_id = $1
            AND (
                $2 = ''
                OR customer_name ILIKE '%' || $2 || '%'
                OR phone ILIKE '%' || $2 || '%'
                OR phone_normalized ILIKE '%' || $2 || '%'
            )
            ORDER BY last_used_at DESC, id DESC
            LIMIT 10`,
        [company, q]
    );
}

async function document(data) {
    const { company, type } = data;
    return await pool.query(
        `SELECT id, company_id, user_id, name, original_name, type, created_at
             FROM document_templates
             WHERE company_id = $1
               AND ($2::text IS NULL OR type = $2)
             ORDER BY id DESC`,
        [company, type]
    );
}

module.exports = { contact, document };