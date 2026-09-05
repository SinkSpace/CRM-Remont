const express = require('express');
const pool = require('../db');

async function query(data) {
    return await pool.query(
        'SELECT ai_prompt, ai_model, ai_enabled FROM system_settings WHERE id = 1');
};

module.exports = query;