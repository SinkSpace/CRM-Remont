const path = require('path');
const pool = require('../db');
const settingsModels = require('../models/settingsModels');
const selectRegister = require('../models/selectRegisterModels');
const insertRegister = require('../models/insertRegisterModels');

const postRegister = async (req, res) => {
    const client = await pool.connect();

    const settingsResult = await settingsModels.registrationEnabled();

    if (settingsResult.rows[0]?.registration_enabled === false) {
        await client.query('ROLLBACK');
        return res.status(403).json({ error: 'Регистрация временно отключена' });
    }

    try {
        await client.query('BEGIN');

        const { email, password, display_name, shop_name, phone } = req.body;

        const passwordRegex = /^(?=.*[a-zа-я])(?=.*[A-ZА-Я])(?=.*\d)(?=.*[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]).{8,}$/;

        if (!passwordRegex.test(password)) {
            await client.query('ROLLBACK');

            return res.status(400).json({
                error: 'Пароль должен содержать минимум 8 символов, заглавную букву, строчную букву, цифру и специальный символ'
            });
        }

        if (!email || !password || !display_name) {
            await client.query('ROLLBACK');
            return res.status(400).json({ error: 'email, password и display_name обязательны' });
        }

        const existingUser = await selectRegister.email(email);

        if (existingUser.rows.length > 0) {
            await client.query('ROLLBACK');
            return res.status(409).json({ error: 'Пользователь с таким email уже существует' });
        }

        const companyResult = await client.query(
            `INSERT INTO companies (name)
             VALUES ($1)
             RETURNING id, name`,
            [shop_name || display_name]
        );

        const company = companyResult.rows[0];
        const passwordHash = await bcrypt.hash(password, 10);

        const userResult = await client.query(
            `INSERT INTO users (email, password_hash, role, company_id)
             VALUES ($1, $2, $3, $4)
             RETURNING id, email, role, company_id`,
            [email, passwordHash, 'master', company.id]
        );

        const user = userResult.rows[0];

        await client.query(
            `INSERT INTO user_profiles (user_id, company_id, display_name, shop_name, phone)
             VALUES ($1, $2, $3, $4, $5)`,
            [user.id, company.id, display_name, shop_name || null, phone || null]
        );

        await client.query(
            `UPDATE companies
             SET owner_user_id = $1
             WHERE id = $2`,
            [user.id, company.id]
        );

        await client.query('COMMIT');

        sendRegisterEmail(email, display_name)
            .catch(mailError => {
                console.error('Ошибка отправки письма:', mailError);
        });

        res.status(201).json({
            message: 'Пользователь зарегистрирован',
            user: {
                id: user.id,
                email: user.email,
                role: user.role,
                company_id: user.company_id
            }
        });
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Ошибка регистрации:', error);
        res.status(500).json({ error: 'Ошибка сервера' });
    } finally {
        client.release();
    }
};

const postLogin = async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({
                error: 'email и password обязательны'
            });
        }

        const result = await pool.query(
            `SELECT
                u.id,
                u.email,
                u.password_hash,
                u.role,
                u.is_active,
                u.company_id,
                p.display_name,
                p.shop_name,
                p.phone,
                p.avatar_url
            FROM users u
            LEFT JOIN user_profiles p ON p.user_id = u.id
            WHERE u.email = $1`,
            [email]
        );

        const user = result.rows[0];

        if (!user) {
            return res.status(401).json({
                error: 'Неверный email или пароль'
            });
        }

        if (!user.is_active) {
            return res.status(403).json({
                error: 'Пользователь отключён'
            });
        }

        const isMatch = await bcrypt.compare(password, user.password_hash);

        if (!isMatch) {
            return res.status(401).json({
                error: 'Неверный email или пароль'
            });
        }

        res.json({
            message: 'Вход выполнен',
            user: {
                id: user.id,
                email: user.email,
                role: user.role,
                company_id: user.company_id,
                display_name: user.display_name,
                shop_name: user.shop_name,
                phone: user.phone,
                avatar_url: user.avatar_url
            }
        });
    } catch (error) {
        console.error('Ошибка входа:', error);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
};

module.exports = { postRegister, postLogin };