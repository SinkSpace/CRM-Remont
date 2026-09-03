const express = require('express');
const pool = require('../db');

async function query(data) {
    const { user, company, name, role, phone, email } = data;
    return await pool.query(
        `INSERT INTO workers (user_id, company_id, name, role, phone, email)
             VALUES ($1, $2, $3, $4, $5, $6)
             RETURNING
                id,
                user_id,
                company_id,
                name,
                role,
                phone,
                email,
                is_active,
                created_at,
                updated_at`,
        [
            user || null,
            company,
            name.trim(),
            role || 'Сотрудник',
            phone || null,
            email || null
        ])
};

module.exports = query;