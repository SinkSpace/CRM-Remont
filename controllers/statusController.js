const select = require('../models/selectStatusModels');
const selectASC = require('../models/selectASCModels');
const insert = require('../models/insertStatusesModels');
const worker = require('../models/insertWorkerModels');
const values = require('../models/insertValuesModels');
const deleteModels = require('../models/deleteModels');

const get = async (req, res) => {
    try {
        const companyId = Number(req.params.companyId);

        const existing = await select(companyId);

        const DEFAULT_STATUSES = [
            'Принят',
            'В работе',
            'Ждёт запчастей',
            'На согласовании',
            'Без ремонта',
            'Сделан',
            'Отменён'
        ];

        if (existing.rows.length > 0) {
            const result = await selectASC.statuses(companyId);
            return res.json(result.rows);
        };

        for (const name of DEFAULT_STATUSES) {
            await insert({user_id: null, company_id: companyId, name});
        };

        const result = await selectASC.statuses(companyId);

        res.json(result.rows);
    } catch (error) {
        console.error('Ошибка загрузки статусов:', error);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
};

const post = async (req, res) => {
    try {
        const { company_id, user_id, name } = req.body;

        if (!company_id || !name) {
            return res.status(400).json({
                error: 'company_id и name обязательны'
            });
        }

        const result = await values.statuses({user_id, company_id, name});

        res.status(201).json(result.rows[0]);
    } catch (error) {
        if (error.code === '23505') {
            return res.status(409).json({
                error: 'Такой статус уже существует'
            });
        }

        console.error('Ошибка добавления статуса:', error);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
};

const del = async (req, res) => {
    try {
        const id = Number(req.params.id);
        const { company_id } = req.body;

        if (!company_id) {
            return res.status(400).json({ error: 'company_id обязателен' });
        }

        const result = await deleteModels.statuses({id, company_id});

        if (!result.rows[0]) {
            return res.status(404).json({
                error: 'Статус не найден или доступ запрещён'
            });
        }

        res.json({ message: 'Статус удалён' });
    } catch (error) {
        console.error('Ошибка удаления статуса:', error);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
};

module.exports = { get, post, del };