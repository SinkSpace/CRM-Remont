const express = require('express');
const pool = require('../db');

async function query(data) {
    const { user, company, name } = data;
    return await pool.query(
        `INSERT INTO devices (user_id, company_id, name)
             VALUES ($1, $2, $3)
             RETURNING id, user_id, company_id, name, is_active, created_at`,
        [user || null, company, name.trim()]);
};

module.exports = query;