const pool = require('../db');

async function companies(shop_name, display_name) {
    const result = await pool.query(
        `INSERT INTO companies (name)
         VALUES ($1)
         RETURNING id, name`,
        [shop_name || display_name]
    );
    return result;
}

async function users(email, password_hash, company_id) {
    const result = await pool.query(
        `INSERT INTO users (email, password_hash, role, company_id)
         VALUES ($1, $2, $3, $4)
         RETURNING id, email, role, company_id`,
        [email, password_hash, 'master', company_id]
    );
    return result;
}

async function userProfiles(user_id, company_id, display_name, shop_name, phone) {
    const result = await pool.query(
        `INSERT INTO user_profiles (user_id, company_id, display_name, shop_name, phone)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING *`,
        [user_id, company_id, display_name, shop_name || null, phone || null]
    );
    return result;
}

module.exports = { companies, users, userProfiles };