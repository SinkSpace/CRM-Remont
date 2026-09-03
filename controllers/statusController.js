const express = require('express');
const router = express.Router();

const get = async (req, res) => {
    try {
        const companyId = Number(req.params.companyId);

        await ensureDefaultStatuses(companyId);

        const result = await pool.query(
            `SELECT id, user_id, company_id, name, created_at
             FROM statuses
             WHERE company_id = $1
             ORDER BY id ASC`,
            [companyId]
        );

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

        const result = await pool.query(
            `INSERT INTO statuses (user_id, company_id, name)
             VALUES ($1, $2, $3)
             RETURNING id, user_id, company_id, name, created_at`,
            [user_id || null, company_id, name.trim()]
        );

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

        const result = await pool.query(
            'DELETE FROM statuses WHERE id = $1 AND company_id = $2 RETURNING id',
            [id, company_id]
        );

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

async function ensureDefaultStatuses(company_id, user_id = null) {
    const existing = await pool.query(
        `SELECT id FROM statuses WHERE company_id = $1 LIMIT 1`,
        [company_id]
    );

    if (existing.rows.length > 0) return;

    for (const name of DEFAULT_STATUSES) {
        await pool.query(
            `INSERT INTO statuses (user_id, company_id, name)
             VALUES ($1, $2, $3)
             ON CONFLICT DO NOTHING`,
            [user_id, company_id, name]
        );
    }

    await pool.query(
        'INSERT INTO workers (user_id, company_id, name, role, phone, email) VALUES ($1, $2, $3, $4, $5, $6)',
            [1,
            company_id,
            'Админ',
            'Администратор',
            '',
            '']
    );

    await pool.query(
        'INSERT INTO workers (user_id, company_id, name, role, phone, email) VALUES ($1, $2, $3, $4, $5, $6)',
            [2,
            company_id,
            'Менеджер',
            'Менеджер',
            '',
            '']
    );

    await pool.query(
        'INSERT INTO workers (user_id, company_id, name, role, phone, email) VALUES ($1, $2, $3, $4, $5, $6)',
            [3,
            company_id,
            'Сотрудник',
            'Сотрудник',
            '',
            '']
    );
}

async function ensureDefaultStatuses(company_id, user_id = null) {
    const existing = await pool.query(
        `SELECT id FROM statuses WHERE company_id = $1 LIMIT 1`,
        [company_id]
    );

    if (existing.rows.length > 0) return;

    for (const name of DEFAULT_STATUSES) {
        await pool.query(
            `INSERT INTO statuses (user_id, company_id, name)
             VALUES ($1, $2, $3)
             ON CONFLICT DO NOTHING`,
            [user_id, company_id, name]
        );
    }

    await pool.query(
        'INSERT INTO workers (user_id, company_id, name, role, phone, email) VALUES ($1, $2, $3, $4, $5, $6)',
            [1,
            company_id,
            'Админ',
            'Администратор',
            '',
            '']
    );

    await pool.query(
        'INSERT INTO workers (user_id, company_id, name, role, phone, email) VALUES ($1, $2, $3, $4, $5, $6)',
            [2,
            company_id,
            'Менеджер',
            'Менеджер',
            '',
            '']
    );

    await pool.query(
        'INSERT INTO workers (user_id, company_id, name, role, phone, email) VALUES ($1, $2, $3, $4, $5, $6)',
            [3,
            company_id,
            'Сотрудник',
            'Сотрудник',
            '',
            '']
    );
}

module.exports = { get, post, del };