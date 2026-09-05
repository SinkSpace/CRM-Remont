const pool = require('../db');

async function companies(data) {
    const { shop, display } = data;
    return await pool.query(
        `INSERT INTO companies (name)
         VALUES ($1)
         RETURNING id, name`,
        [shop || display]
    );
}

async function users(data) {
    const { email, hash, company } = data;
    return await pool.query(
        `INSERT INTO users (email, password_hash, role, company_id)
         VALUES ($1, $2, $3, $4)
         RETURNING id, email, role, company_id`,
        [email, hash, 'master', company]
    );
}

async function userProfiles(data) {
    const { user, company, display, shop, phone } = data;
    return await pool.query(
        `INSERT INTO user_profiles (user_id, company_id, display_name, shop_name, phone)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING *`,
        [user, company, display, shop || null, phone || null]
    );
}

module.exports = { companies, users, userProfiles };