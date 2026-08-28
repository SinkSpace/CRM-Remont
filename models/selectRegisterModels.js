const express = require('express');
const pool = require('../db');
const client = pool.connect();

async function email(data) {
    email = data;
    return await pool.query(
        'SELECT id FROM users WHERE email = $1',
    [email]);
}

async function emailPlus(data) {
    email = data;
    return await pool.query(
        `SELECT
            u.id,
            u.email,
            u.password_hash,
            u.role,
            u.is_active,
            u.company_id,
            p.display_name,
            p.shop_name,
            p.phone,
            p.avatar_url
        FROM users u
        LEFT JOIN user_profiles p ON p.user_id = u.id
        WHERE u.email = $1`,
        [email]
    )
};

module.exports = { email, emailPlus };

