const express = require('express');
const pool = require('./../db');

async function upsertContact(company_id, customer_name, phone) {
    const phone_normalized = normalizePhone(phone);

    if (!customer_name || !phone_normalized) return null;

    const existing = await pool.query(
        `SELECT id
         FROM contacts
         WHERE company_id = $1 AND phone_normalized = $2`,
        [company_id, phone_normalized]
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
            [customer_name, phone, existing.rows[0].id]
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

async function upsertDevice(company_id, user_id, name) {
    const trimmed = String(name || '').trim();
    if (!trimmed) return null;

    const existing = await pool.query(
        `SELECT id, name
         FROM devices
         WHERE company_id = $1
           AND LOWER(name) = LOWER($2)
         LIMIT 1`,
        [company_id, trimmed]
    );

    if (existing.rows[0]) return existing.rows[0];

    const result = await pool.query(
        `INSERT INTO devices (company_id, user_id, name)
         VALUES ($1, $2, $3)
         RETURNING *`,
        [company_id, user_id || null, trimmed]
    );

    return result.rows[0];
}

function normalizePhone(phone = '') {
    return String(phone).replace(/\D/g, '');
}

module.exports = { upsertContact, upsertDevice };