const express = require('express');
const pool = require('../db');

async function company(data) {
    const company_id = data;
    return await pool.query(
        `SELECT
            id,
            user_id,
            company_id,
            name,
            role,
            phone,
            email,
            is_active,
            created_at,
            updated_at
            FROM workers
            WHERE company_id = $1
        ORDER BY id ASC`,
        [company_id]);
};

async function id(data) {
    const { id, company_id } = data;
    return await pool.query(
        'SELECT id FROM workers WHERE id = $1 AND company_id = $2',
            [id, company_id]
    )
}

module.exports = { company, id };