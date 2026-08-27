const express = require('express');
const pool = require('../db');

async function order(data) {
    const { id, company_id } = data;
    const result = await pool.query(
            `SELECT
                id, phone, customer, worker, device, model, SN,
                status, price, pre,
                acceptDate, deadline, crush, note
             FROM orders
             WHERE id = $1 AND company_id = $2`,
            [id, company_id]);

    return result;
}

async function worker(data) {
    const { id, company_id } = data;
    const result = await pool.query(
            `SELECT id, customer, worker, model, status, price, is_archived
             FROM orders
             WHERE id = $1 AND company_id = $2`,
            [id, company_id]);
            
    return result;
}

module.exports = { order, worker };