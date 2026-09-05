const pool = require('../db');

async function query(data) {
    const { user_id, company_id, name, role, phone, email } = data;
    return await pool.query(
        `INSERT INTO workers (user_id, company_id, name, role, phone, email)
             VALUES ($1, $2, $3, $4, $5, $6)
             RETURNING
                id,
                user_id,
                company_id,
                name,
                role,
                phone,
                email,
                is_active,
                created_at,
                updated_at`,
        [
            user_id || null,
            company_id,
            name.trim(),
            role || 'Сотрудник',
            phone || null,
            email || null
        ])
};

async function startAdmin(data) {
    const company_id = data;
    return pool.query(
        'INSERT INTO workers (user_id, company_id, name, role, phone, email) VALUES ($1, $2, $3, $4, $5, $6)',
            [1,
            company_id,
            'Админ',
            'Администратор',
            '',
            '']
    )
}

async function startManager(data) {
    const company_id = data;
    return pool.query(
        'INSERT INTO workers (user_id, company_id, name, role, phone, email) VALUES ($1, $2, $3, $4, $5, $6)',
            [2,
            company_id,
            'Менеджер',
            'Менеджер',
            '',
            '']
    )
}

async function startWorker(data) {
    const company_id = data;
    return pool.query(
        'INSERT INTO workers (user_id, company_id, name, role, phone, email) VALUES ($1, $2, $3, $4, $5, $6)',
            [3,
            company_id,
            'Сотрудник',
            'Сотрудник',
            '',
            '']
    )
}

module.exports = { query, startAdmin, startManager, startWorker };