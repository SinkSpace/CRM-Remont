const pool = require('../db');

async function isAdmin(admin_id) {
    const result = await pool.query(
        'SELECT id FROM users WHERE id = $1 AND role = $2 AND is_active = true',
        [admin_id, 'admin']
    );

    return result.rows.length > 0;
}

async function checkSiteAdmin(adminId) {
    const result = await pool.query(
        `SELECT id, email, role
         FROM users
         WHERE id = $1 AND role = 'admin' AND is_active = true`,
        [adminId]
    );

    return result.rows[0];
}

const put = async (req, res) => {
    try {
        const adminId = Number(req.body.admin_id);
        const targetUserId = Number(req.params.id);
        const isActive = Boolean(req.body.is_active);

        const admin = await checkSiteAdmin(adminId);

        if (!admin) {
            return res.status(403).json({ error: 'Доступ запрещён' });
        }

        if (adminId === targetUserId) {
            return res.status(400).json({ error: 'Нельзя отключить самого себя' });
        }

        const result = await pool.query(
            `UPDATE users
             SET is_active = $1
             WHERE id = $2
             RETURNING id, email, role, is_active`,
            [isActive, targetUserId]
        );

        if (!result.rows[0]) {
            return res.status(404).json({ error: 'Пользователь не найден' });
        }

        res.json(result.rows[0]);
    } catch (error) {
        console.error('Ошибка изменения пользователя:', error);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
};

const get = async (req, res) => {
    try {
        const adminId = Number(req.query.admin_id);

        if (!await isAdmin(adminId)) {
            return res.status(403).json({ error: 'Доступ запрещён' });
        }

        const statsResult = await pool.query(`
            SELECT
                (SELECT COUNT(*) FROM companies) AS companies_count,
                (SELECT COUNT(*) FROM users) AS users_count,
                (SELECT COUNT(*) FROM orders) AS orders_count,
                (SELECT COUNT(*) FROM generated_documents) AS documents_count
        `);

        const companiesResult = await pool.query(`
            SELECT
                c.id,
                c.name,
                u.email AS owner_email,
                COUNT(all_users.id) AS users_count
            FROM companies c
            LEFT JOIN users u ON u.id = c.owner_user_id
            LEFT JOIN users all_users ON all_users.company_id = c.id
            GROUP BY c.id, c.name, u.email
            ORDER BY c.id DESC
        `);

        const usersResult = await pool.query(`
            SELECT
                u.id,
                u.email,
                u.role,
                u.is_active,
                u.company_id,
                p.display_name
            FROM users u
            LEFT JOIN user_profiles p ON p.user_id = u.id
            ORDER BY u.id DESC
        `);

        const settingsResult = await pool.query(
            'SELECT * FROM system_settings WHERE id = 1'
        );

        res.json({
            stats: statsResult.rows[0],
            companies: companiesResult.rows,
            users: usersResult.rows,
            settings: settingsResult.rows[0] || {}
        });
    } catch (error) {
        console.error('Ошибка админ-панели:', error);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
};

const settings = async (req, res) => {
    try {
        const {
            admin_id,
            ai_prompt,
            ai_model,
            ai_enabled,
            registration_enabled
        } = req.body;

        if (!await isAdmin(Number(admin_id))) {
            return res.status(403).json({ error: 'Доступ запрещён' });
        }

        const result = await pool.query(`
            UPDATE system_settings
            SET ai_prompt = $1,
                ai_model = $2,
                ai_enabled = $3,
                registration_enabled = $4,
                updated_at = NOW()
            WHERE id = 1
            RETURNING *
        `, [
            ai_prompt,
            ai_model || 'GigaChat-2',
            Boolean(ai_enabled),
            Boolean(registration_enabled)
        ]);

        res.json(result.rows[0]);
    } catch (error) {
        console.error('Ошибка сохранения настроек:', error);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
};

module.exports = { get, put, settings };