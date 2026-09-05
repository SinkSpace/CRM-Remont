const express = require('express');
const pool = require('../db');

async function upsertContact(data) {
    const { company, customer, phone } = data;
    const phone_normalized = String(phone).replace(/\D/g, '');;

    if (!customer || !phone_normalized) return null;

    const existing = await pool.query(
        `SELECT id
         FROM contacts
         WHERE company_id = $1 AND phone_normalized = $2`,
        [company, phone_normalized]
    );

    if (existing.rows[0]) {
        const result = await pool.query(
            `UPDATE contacts
             SET customer_name = $1,
                 phone = $2,
                 updated_at = NOW(),
                 last_used_at = NOW()
             WHERE id = $3
             RETURNING *`,
            [customer, phone, existing.rows[0].id]
        );
        return result.rows[0];
    }

    const result = await pool.query(
        `INSERT INTO contacts (company_id, customer_name, phone, phone_normalized)
         VALUES ($1, $2, $3, $4)
         RETURNING *`,
        [company_id, customer_name, phone, phone_normalized]
    );

    return result.rows[0];
}

async function upsertDevice(data) {
    const { company, user, name } = data;
    const trimmed = String(name || '').trim();
    if (!trimmed) return null;

    const existing = await pool.query(
        `SELECT id, name
         FROM devices
         WHERE company_id = $1
           AND LOWER(name) = LOWER($2)
         LIMIT 1`,
        [company, trimmed]
    );

    if (existing.rows[0]) return existing.rows[0];

    const result = await pool.query(
        `INSERT INTO devices (company_id, user_id, name)
         VALUES ($1, $2, $3)
         RETURNING *`,
        [company, user || null, trimmed]
    );

    return result.rows[0];
}

module.exports = { upsertContact, upsertDevice };