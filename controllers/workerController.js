const selectWorker = require('../models/selectCompanyModels');
const worker = require('../models/insertWorkerModels');
const update = require('../models/updateModels');
const del = require('../models/deleteModels');

const getCompanyID = async (req, res) => {
    try {
        const companyId = Number(req.params.companyId);

        const result = await selectWorker.company(companyId);

        res.json(result.rows);
    } catch (error) {
        console.error('Ошибка загрузки сотрудников:', error);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
};

const postWorkers = async (req, res) => {
    try {
        const { company_id, user_id, name, role, phone, email } = req.body;

        if (!company_id || !name) {
            return res.status(400).json({
                error: 'company_id и name обязательны'
            });
        }

        const result = await worker({user_id, company_id, name, role, phone, email});

        res.status(201).json(result.rows[0]);
    } catch (error) {
        console.error('Ошибка добавления сотрудника:', error);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
};

const putWorkers = async (req, res) => {
    try {
        const id = Number(req.params.id);
        const { company_id, name, role, phone, email, is_active } = req.body;

        if (!company_id || !name) {
            return res.status(400).json({
                error: 'company_id и name обязательны'
            });
        }

        const checkResult = await selectWorker.id({id, company_id});

        if (!checkResult.rows[0]) {
            return res.status(404).json({ error: 'Сотрудник не найден или доступ запрещён' });
        }

        const result = await update.worker({name, role, phone, email, is_active, id, company_id});

        if (!result.rows[0]) {
            return res.status(404).json({ error: 'Сотрудник не найден' });
        }

        res.json(result.rows[0]);
    } catch (error) {
        console.error('Ошибка обновления сотрудника:', error);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
};

const deleteWorkers = async (req, res) => {
    try {
        const id = Number(req.params.id);
        const { company_id } = req.body;

        if (!company_id) {
            return res.status(400).json({ error: 'company_id обязателен' });
        }

        const result = await del.workers({id, company_id});

        if (!result.rows[0]) {
            return res.status(404).json({ error: 'Сотрудник не найден или доступ запрещён' });
        }

        res.json({ message: 'Сотрудник удалён' });
    } catch (error) {
        console.error('Ошибка удаления сотрудника:', error);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
};

module.exports = { getCompanyID, postWorkers, putWorkers, deleteWorkers };