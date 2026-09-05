const pool = require('../db');

async function query(data) {
    const { user_id, company_id, name } = data;
    return await pool.query(
        `INSERT INTO statuses (user_id, company_id, name)
             VALUES ($1, $2, $3)
             ON CONFLICT DO NOTHING`,
        [user_id, company_id, name]);
};

module.exports = query;