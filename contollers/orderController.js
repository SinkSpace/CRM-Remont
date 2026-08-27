const path = require('path');
const query = require('../models/orderModels');
const upsertModels = require('../models/upsertModels');
const selectOrderModels = require('../models/selectOrderModels');
const selectAllOrderModels = require('../models/selectAllOrderModels');
const writeLog = require('../models/writeLog');

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

        await upsertModels.upsertContact(company_id, customer, phone);
        await upsertModels.upsertDevice(company_id, user_id, device);

        const result = await query(req.body);

        const order = result.rows[0];

        await writeLog.writeLog({
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

const getOrders = async (req, res) => {
    try {
        const { company_id } = req.query;

        if (!company_id) {
            return res.status(400).json({ error: 'company_id required' });
        }

        const result = selectOrderModels;

        res.json(result.rows);
    } catch (error) {
        console.error('Ошибка при получении заказов:', error);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
};

const getCompanyID = async (req, res) => {
    try {
        const companyId = Number(req.params.companyId);

        const result = selectAllOrderModels;

        res.json(result.rows);
    } catch (error) {
        console.error('Ошибка при получении заказов:', error);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
};

const getID = async (req, res) => {
    try {
        const id = Number(req.params.id);

        const {
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
            return res.status(400).json({ error: 'company_id required' });
        }

        const beforeResult = await pool.query(
            `SELECT
                id, phone, customer, worker, device, model, SN,
                status, price, pre,
                acceptDate, deadline, crush, note
             FROM orders
             WHERE id = $1 AND company_id = $2`,
            [id, company_id]
        );

        const before = beforeResult.rows[0];

        await upsertContact(company_id, customer, phone);
        await upsertDevice(company_id, user_id, device);

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

        const updatedOrder = result.rows[0];

        await writeLog({
            company_id,
            user_id: user_id || null,
            entity_type: 'order',
            entity_id: updatedOrder.id,
            action: 'update',
            title: `Изменён заказ №${updatedOrder.id}`,
            details: {
                before,
                after: updatedOrder
            }
        });

        res.json(updatedOrder);
    } catch (error) {
        console.error('Ошибка при обновлении заказа:', error);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
};

module.exports = { postOrders, getOrders, getCompanyID, getID };