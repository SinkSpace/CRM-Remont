const express = require('express');
const pool = require('../db');

async function query(data) {
    const company_id = data;
    const result = pool.query(`
        SELECT
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
            note,
            is_archived,
            archived_at
            FROM orders
            WHERE company_id = $1
            AND is_archived = true
            ORDER BY archived_at DESC NULLS LAST, id DESC
            `, [company_id]);

    return result;

    };

module.exports = query;