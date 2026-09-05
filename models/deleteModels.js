const pool = require('../db');

async function workers(data) {
    const { id, company_id } = data;
    return await pool.query(
        'DELETE FROM workers WHERE id = $1 AND company_id = $2 RETURNING id',
        [id, company_id]);
};

async function devices(data) {
    const { id, company_id } = data;
    return await pool.query(
        'DELETE FROM devices WHERE id = $1 AND company_id = $2 RETURNING id',
        [id, company_id]);
};

async function statuses(data) {
    const { id, company_id } = data;
    return await pool.query(
        'DELETE FROM statuses WHERE id = $1 AND company_id = $2 RETURNING id',
        [id, company_id]);
};

async function document(data) {
    const { id, company_id } = data;
    return await pool.query(
        `DELETE FROM document_templates
             WHERE id = $1 AND company_id = $2
             RETURNING *`,
        [id, company_id]);
}

module.exports = { workers, devices, statuses, document };