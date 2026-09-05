const express = require('express');
const pool = require('../db');

async function devices(data) {
    company = data;
    return await pool.query(
        `SELECT id, user_id, company_id, name, is_active, created_at
             FROM devices
             WHERE company_id = $1
             ORDER BY id ASC`,
        [company]);
};

async function statuses(data) {
    company = data;
    return await pool.query(
        `SELECT id, user_id, company_id, name, created_at
             FROM statuses
             WHERE company_id = $1
             ORDER BY id ASC`,
        [company]);
};

module.exports = { devices, statuses };