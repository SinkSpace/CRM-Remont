const express = require('express');
const pool = require('../db');

async function orders(data) {
    const { phone, customer, worker, device, model, SN, status, price, pre, acceptDate, deadline, crush, note, id, company_id } = data;
    const result = await pool.query(
            `UPDATE orders
             SET phone = $1,
                 customer = $2,
                 worker = $3,
                 device = $4,
                 model = $5,
                 SN = $6,
                 status = $7,
                 price = $8,
                 pre = $9,
                 acceptDate = $10,
                 deadline = $11,
                 crush = $12,
                 note = $13
             WHERE id = $14 AND company_id = $15
             RETURNING
                 id,
                 phone,
                 customer,
                 worker,
                 device,
                 model,
                 SN AS "SN",
                 status,
                 price,
                 pre,
                 acceptDate AS "acceptDate",
                 deadline,
                 crush,
                 note`,
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
                id,
                company_id
            ]
        );

    return result;
}

async function archived(data) {
    const { id, company_id } = data;
    const result = await pool.query(
            `UPDATE orders
             SET is_archived = true,
                 archived_at = NOW()
             WHERE id = $1 AND company_id = $2
             RETURNING *`,
            [id, company_id]
        );

    return result;
};

module.exports = { orders, archived };