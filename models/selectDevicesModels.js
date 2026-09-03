const express = require('express');
const pool = require('../db');

async function query(data) {
    company = data;
    return await pool.query(
        `SELECT id, user_id, company_id, name, is_active, created_at
             FROM devices
             WHERE company_id = $1
             ORDER BY id ASC`,
        [company]);
};

module.exports = query;