const express = require('express');
const pool = require('../db');
const client = pool.connect();

async function email(data) {
    email = data;
    return await pool.query(
        'SELECT id FROM users WHERE email = $1',
    [email]);
}

module.exports = { email };