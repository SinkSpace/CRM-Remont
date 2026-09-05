const express = require('express');
const pool = require('../db');

async function query(data) {
    user_id = data;
    return await pool.query(
        `SELECT 
            u.id,
            u.email,
            p.display_name,
            p.shop_name,
            p.city,
            p.address,
            p.phone,
            p.avatar_url,
            c.work_days,
            c.work_time_start,
            c.work_time_end
        FROM users u
        LEFT JOIN user_profiles p ON p.user_id = u.id
        LEFT JOIN companies c ON c.id = u.company_id
        WHERE u.id = $1`,
        [user_id]);
};

module.exports = query;