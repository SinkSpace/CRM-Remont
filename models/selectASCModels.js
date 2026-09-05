const express = require('express');
const pool = require('../db');

async function devices(data) {
    company_id = data;
    return await pool.query(
        `SELECT id, user_id, company_id, name, is_active, created_at
             FROM devices
             WHERE company_id = $1
             ORDER BY id ASC`,
        [company_id]);
};

async function statuses(data) {
    company_id = data;
    return await pool.query(
        `SELECT id, user_id, company_id, name, created_at
             FROM statuses
             WHERE company_id = $1
             ORDER BY id ASC`,
        [company_id]);
};

module.exports = { devices, statuses };