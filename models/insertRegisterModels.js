const express = require('express');
const pool = require('../db');
const client = pool.connect();

async function companies(data) {
    const { shop, display } = data;
    return await client.query(
        `INSERT INTO companies (name)
            VALUES ($1)
            RETURNING id, name`,
        [shop || display]
    );
}

async function users(data) {
    const { email, password, company_id } = data;
    return client.query(
        `INSERT INTO users (email, password_hash, role, company_id)
            VALUES ($1, $2, $3, $4)
            RETURNING id, email, role, company_id`,
        [email, password, 'master', company_id]
    );
}

async function userProfiles(data) {
    const { user, company, display, shop, phone } = data;
    return client.query(
            `INSERT INTO user_profiles (user_id, company_id, display_name, shop_name, phone)
             VALUES ($1, $2, $3, $4, $5)`,
            [user, company, display, shop || null, phone || null]
        );
}

module.exports = { companies, users, userProfiles };