const select = require('../models/selectASCModels');
const insert = require('../models/insertValuesModels');
const deleteModels = require('../models/deleteModels');

const get = async (req, res) => {
    try {
        const companyId = Number(req.params.companyId);

        const result = await select.devices(companyId);

        res.json(result.rows);
    } catch (error) {
        console.error('Ошибка загрузки устройств:', error);
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

        const result = await insert.devices({user_id, company_id, name});

        res.status(201).json(result.rows[0]);
    } catch (error) {
        if (error.code === '23505') {
            return res.status(409).json({
                error: 'Такое устройство уже существует'
            });
        }

        console.error('Ошибка добавления устройства:', error);
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

        const result = await deleteModels.devices({id, company_id});

        if (!result.rows[0]) {
            return res.status(404).json({
                error: 'Устройство не найдено или доступ запрещён'
            });
        }

        res.json({ message: 'Устройство удалено' });
    } catch (error) {
        console.error('Ошибка удаления устройства:', error);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
};

module.exports = { get, post, del };