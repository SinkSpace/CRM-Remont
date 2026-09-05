const select = require('../models/selectStatModels');

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

    const result = await pool.query(`
        SELECT 
            COALESCE(worker, 'Без сотрудника') AS name,
            COALESCE(SUM(price), 0) AS income,
            COUNT(*) AS orders_count
        FROM orders
        WHERE company_id = $1 AND DATE(created_at) = $2
        GROUP BY worker
        ORDER BY income DESC
    `, [company_id, date]);

    res.json(result.rows);
};

const month = async (req, res) => {
    const { date, company_id } = req.query;

    if (!company_id || !date) {
        return res.status(400).json({ error: 'company_id and date required' });
    }

    const result = await pool.query(`
        SELECT 
            COALESCE(worker, 'Без сотрудника') AS name,
            COALESCE(SUM(price), 0) AS income,
            COUNT(*) AS orders_count
        FROM orders
        WHERE company_id = $1 
          AND DATE_TRUNC('month', created_at) = DATE_TRUNC('month', $2::date)
        GROUP BY worker
        ORDER BY income DESC
    `, [company_id, date]);

    res.json(result.rows);
};

module.exports = { total, day, month };