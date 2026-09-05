const express = require('express');
const pool = require('../db');

async function query(data) {
    company_id = data;
    return await pool.query(
        `SELECT id FROM statuses WHERE company_id = $1 LIMIT 1`,
        [company_id]);
}

module.exports = query;