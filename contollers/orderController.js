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



module.exports = { postOrders };