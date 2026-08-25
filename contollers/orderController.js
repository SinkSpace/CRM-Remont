const path = require('path');
const query = require('../models/orderModels');

/* 1. Создание заказа */
const postOrders = async (req, res) => {
    try {
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
        } = req.body;

        if (!company_id) {
            return res.status(400).json({ error: 'company_id required' }); //если компании не (прямой переход)
        }

        if (!user_id) {
            return res.status(400).json({ error: 'user_id required' }); //если пользователь не авторизован
        }

        await upsertContact(company_id, customer, phone);
        await upsertDevice(company_id, user_id, device);

        const result = await query(req.body);

        const order = result.rows[0];

        await writeLog({
            company_id,
            user_id,
            entity_type: 'order',
            entity_id: order.id,
            action: 'create',
            title: `Создан заказ №${order.id}`,
            details: {
                model: order.model,
                customer: order.customer,
                worker: order.worker,
                status: order.status,
                price: order.price
            }
        });

        res.status(201).json(order);
    } catch (error) {
        console.error('Ошибка при добавлении заказа:', error);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
};


async function upsertContact(company_id, customer_name, phone) {
    const phone_normalized = normalizePhone(phone);

    if (!customer_name || !phone_normalized) return null;

    const existing = await pool.query(
        `SELECT id
         FROM contacts
         WHERE company_id = $1 AND phone_normalized = $2`,
        [company_id, phone_normalized]
    );

    if (existing.rows[0]) {
        const result = await pool.query(
            `UPDATE contacts
             SET customer_name = $1,
                 phone = $2,
                 updated_at = NOW(),
                 last_used_at = NOW()
             WHERE id = $3
             RETURNING *`,
            [customer_name, phone, existing.rows[0].id]
        );
        return result.rows[0];
    }

    const result = await pool.query(
        `INSERT INTO contacts (company_id, customer_name, phone, phone_normalized)
         VALUES ($1, $2, $3, $4)
         RETURNING *`,
        [company_id, customer_name, phone, phone_normalized]
    );

    return result.rows[0];
}

async function upsertDevice(company_id, user_id, name) {
    const trimmed = String(name || '').trim();
    if (!trimmed) return null;

    const existing = await pool.query(
        `SELECT id, name
         FROM devices
         WHERE company_id = $1
           AND LOWER(name) = LOWER($2)
         LIMIT 1`,
        [company_id, trimmed]
    );

    if (existing.rows[0]) return existing.rows[0];

    const result = await pool.query(
        `INSERT INTO devices (company_id, user_id, name)
         VALUES ($1, $2, $3)
         RETURNING *`,
        [company_id, user_id || null, trimmed]
    );

    return result.rows[0];
}

async function writeLog({
    company_id,
    user_id = null,
    entity_type,
    entity_id = null,
    action,
    title,
    details = null
}) {
    try {
        await pool.query(
            `INSERT INTO logs (company_id, user_id, entity_type, entity_id, action, title, details)
             VALUES ($1, $2, $3, $4, $5, $6, $7)`,
            [
                company_id,
                user_id,
                entity_type,
                entity_id,
                action,
                title,
                details ? JSON.stringify(details) : null
            ]
        );
    } catch (error) {
        console.error('Ошибка записи лога:', error);
    }
}

module.exports = { postOrders };