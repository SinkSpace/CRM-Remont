const pool = require('../db');

async function devices(data) {
    const { user_id, company_id, name } = data;
    return await pool.query(
        `INSERT INTO devices (user_id, company_id, name)
             VALUES ($1, $2, $3)
             RETURNING id, user_id, company_id, name, is_active, created_at`,
        [user_id || null, company_id, name.trim()]);
};

async function statuses(data) {
    const { user_id, company_id, name } = data;
    return await pool.query(
        `INSERT INTO statuses (user_id, company_id, name)
             VALUES ($1, $2, $3)
             RETURNING id, user_id, company_id, name, created_at`,
        [user_id || null, company_id, name.trim()]);
};

async function document(data) {
    const { company_id, user_id, name, file, original, type} = data;
    return await pool.query(
        `INSERT INTO document_templates (company_id, user_id, name, file_path, original_name, type)
             VALUES ($1, $2, $3, $4, $5, $6)
             RETURNING *`,
        [company_id, user_id || null, name.trim(), file, original, type || 'act']
    );
}

async function generate(data) {
    const { company_id, order, template, user_id, output } = data;
    return await pool.query(
        `INSERT INTO generated_documents (company_id, order_id, template_id, created_by, file_path)
             VALUES ($1, $2, $3, $4, $5)`,
        [company_id, order, template, user_id || null, output]
    )
}

module.exports = { devices, statuses, document, generate };