const select = require('../models/selectLogModels');

const get = async (req, res) => {
    try {
        const companyId = Number(req.params.companyId);

        const result = await select(companyId);

        res.json(result.rows);
    } catch (error) {
        console.error('Ошибка загрузки логов:', error);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
};

module.exports = get;