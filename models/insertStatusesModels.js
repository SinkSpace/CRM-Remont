const pool = require('../db');

async function query(data) {
    const { user, company, name } = data;
    return await pool.query(
        `INSERT INTO statuses (user_id, company_id, name)
             VALUES ($1, $2, $3)
             ON CONFLICT DO NOTHING`,
        [user, company, name]);
};

module.exports = query;