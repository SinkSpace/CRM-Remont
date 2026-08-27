const express = require('express');
const pool = require('../db');

async function query(data) {
    const { //характеристики заказа
            phone,
            customer,
            worker,
            device,
            model,
            SN,
            status,
            price,
            pre,
            acceptDate,
            deadline,
            crush,
            note,
            user_id,
            company_id
        } = data;

    return await pool.query(
        `INSERT INTO orders
        (
            phone,
            customer,
            worker,
            device,
            model,
            SN,
            status,
            price,
            pre,
            acceptDate,
            deadline,
            crush,
            note,
            user_id,
            company_id
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
        RETURNING *`,
        [
            phone,
            customer,
            worker,
            device,
            model,
            SN,
            status,
            price,
            pre,
            acceptDate,
            deadline,
            crush,
            note,
            user_id,
            company_id
        ]
    );
}

module.exports = query;