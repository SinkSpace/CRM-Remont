const select = require('../models/selectDESCModels');

const get = async (req, res) => {
    try {
        const companyId = Number(req.params.companyId);
        const q = String(req.query.q || '').trim();

        const result = await select.contact({companyId, q});

        res.json(result.rows);
    } catch (error) {
        console.error('Ошибка загрузки контактов:', error);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
};

module.exports = get;