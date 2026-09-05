const pool = require('../db');

async function query(data) {
    const { template, company } = data;
    return await pool.query(
        `SELECT *
             FROM document_templates
             WHERE id = $1 AND company_id = $2`,
        [template, company]
    )
}

module.exports = query;