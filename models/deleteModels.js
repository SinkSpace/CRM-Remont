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

module.exports = { workers, devices };