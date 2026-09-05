const pool = require('../db');

async function devices(data) {
    const { user, company, name } = data;
    return await pool.query(
        `INSERT INTO devices (user_id, company_id, name)
             VALUES ($1, $2, $3)
             RETURNING id, user_id, company_id, name, is_active, created_at`,
        [user || null, company, name.trim()]);
};

async function statuses(data) {
    const { user, company, name } = data;
    return await pool.query(
        `INSERT INTO statuses (user_id, company_id, name)
             VALUES ($1, $2, $3)
             RETURNING id, user_id, company_id, name, created_at`,
        [user || null, company, name.trim()]);
};

async function document(data) {
    const { company, user, name, file, original, type} = data;
    return await pool.query(
        `INSERT INTO document_templates (company_id, user_id, name, file_path, original_name, type)
             VALUES ($1, $2, $3, $4, $5, $6)
             RETURNING *`,
        [company, user || null, name.trim(), file, original, type || 'act']
    );
}

async function generate(data) {
    const { company, order, template, user, output } = data;
    return await pool.query(
        `INSERT INTO generated_documents (company_id, order_id, template_id, created_by, file_path)
             VALUES ($1, $2, $3, $4, $5)`,
        [company, order, template, user || null, output]
    )
}

module.exports = { devices, statuses, document, generate };