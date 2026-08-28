const express = require('express');
const pool = require('../db');
const client = pool.connect();

async function registrationEnabled(data) {
    return await client.query(
        'SELECT registration_enabled FROM system_settings WHERE id = 1'
    );
};

module.exports = { registrationEnabled, };