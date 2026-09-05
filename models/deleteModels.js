const express = require('express');
const pool = require('../db');

async function workers(data) {
    const { id, company } = data;
    return await pool.query(
        'DELETE FROM workers WHERE id = $1 AND company_id = $2 RETURNING id',
        [id, company]);
};

async function devices(data) {
    const { id, company } = data;
    return await pool.query(
        'DELETE FROM devices WHERE id = $1 AND company_id = $2 RETURNING id',
        [id, company]);
};

async function statuses(data) {
    const { id, company } = data;
    return await pool.query(
        'DELETE FROM statuses WHERE id = $1 AND company_id = $2 RETURNING id',
        [id, company]);
};

async function document(data) {
    const { id, company } = data;
    return await pool.query(
        `DELETE FROM document_templates
             WHERE id = $1 AND company_id = $2
             RETURNING *`,
        [id, company]);
}

module.exports = { workers, devices, statuses, document };