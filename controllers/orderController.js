const path = require('path');
const query = require('../models/orderModels');
const upsertModels = require('../models/upsertModels');
const selectOrderModels = require('../models/selectOrderModels');
const selectAllOrderModels = require('../models/selectAllOrderModels');
const writeLog = require('../models/writeLog');
const beforeModels = require('../models/beforeModels');
const update = require('../models/updateModels');
const upsert = require('../models/upsertModels');

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

        await upsert.upsertContact({company_id, customer, phone});
        await upsert.upsertDevice({company_id, user_id, device});

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

const getOrders = async (req, res) => {
    try {
        const { company_id } = req.query;

        if (!company_id) {
            return res.status(400).json({ error: 'company_id required' });
        }

        const result = await selectOrderModels(company_id);

        res.json(result.rows);
    } catch (error) {
        console.error('Ошибка при получении заказов:', error);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
};

const getCompanyID = async (req, res) => {
    try {
        const companyId = Number(req.params.companyId);

        const result = await selectAllOrderModels(companyId);

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

        const beforeResult = await beforeModels.order({id, company_id});

        const before = beforeResult.rows[0];

        await upsertContact({company_id, customer, phone});
        await upsertDevice({company_id, user_id, device});

        const result = await update.orders({phone, customer, worker, device, model, SN, status, price, pre, acceptDate, deadline, crush, note, id, company_id});

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

const getArchiveID = async (req, res) => {
    try {
        const id = Number(req.params.id);
        const { company_id, user_id } = req.body;

        if (!company_id) {
            return res.status(400).json({ error: 'company_id required' });
        }

        const beforeResult = await beforeModels.worker({id, company_id});

        const before = beforeResult.rows[0];

        if (!before) {
            return res.status(404).json({ error: 'Заказ не найден' });
        }

        const result = await update.archived({id, company_id});

        await writeLog({
            company_id,
            user_id: user_id || null,
            entity_type: 'order',
            entity_id: id,
            action: 'archive',
            title: `Заказ №${id} отправлен в архив`,
            details: {
                before,
                after: result.rows[0]
            }
        });

        res.json(result.rows[0]);
    } catch (error) {
        console.error('Ошибка архивации заказа:', error);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
};

module.exports = { postOrders, getOrders, getCompanyID, getID, getArchiveID };