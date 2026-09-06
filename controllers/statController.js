const select = require('../models/selectStatModels');
const DESC = require('../models/selectDESCModels');

const total = async (req, res) => {
    const { type, date, company_id } = req.query;

    if (!company_id) {
        return res.status(400).json({ error: 'company_id required' });
    }

    try {
        let result;

        if (type === 'day') {
            result = await select.dayCoalesce({company_id, date});
        } else if (type === 'month') {
            result = await select.monthCoalesce({company_id, date});
        } else {
            return res.status(400).json({ error: 'type must be "day" or "month"' });
        }

        res.json(result.rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
};

const day = async (req, res) => {
    const { date, company_id } = req.query;

    if (!company_id || !date) {
        return res.status(400).json({ error: 'company_id and date required' });
    }

    const result = await DESC.stat({company_id, date});

    res.json(result.rows);
};

const month = async (req, res) => {
    const { date, company_id } = req.query;

    if (!company_id || !date) {
        return res.status(400).json({ error: 'company_id and date required' });
    }

    const result = await DESC.statDate({company_id, date});

    res.json(result.rows);
};

module.exports = { total, day, month };