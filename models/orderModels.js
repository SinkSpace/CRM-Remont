const pool = require('../db');

async function order(data) {
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

async function findOrder(data) {
    company_id = data;
    const result = await pool.query(`
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
              AND is_archived = false
            ORDER BY id DESC
        `, [company_id]);

    return result;
}

async function findAll(data) {
    company_id = data;
    const result = await pool.query(`
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
                note
            FROM orders
            WHERE company_id = $1
            ORDER BY id DESC
        `, [company_id]);

    return result;
}

module.exports = { order, findOrder, findAll };