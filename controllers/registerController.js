const pool = require('../db');
const client = pool.connect();
const bcrypt = require('bcrypt');
const settings = require('../models/settingsModels');
const selectRegister = require('../models/selectRegisterModels');
const insertRegister = require('../models/insertRegisterModels');
const update = require('../models/updateModels');
const mail = require('../models/mailModels');

const postRegister = async (req, res) => {
    const client = await pool.connect();

    try {
        await client.query('BEGIN');

        const settingsResult = await settings.registrationEnabled();
        if (settingsResult.rows[0]?.registration_enabled === false) {
            await client.query('ROLLBACK');
            return res.status(403).json({ error: 'Регистрация временно отключена' });
        }

        const { email, password, display_name, shop_name, phone } = req.body;

        if (!email || !password || !display_name) {
            await client.query('ROLLBACK');
            return res.status(400).json({ error: 'email, password и display_name обязательны' });
        }

        const passwordRegex = /^(?=.*[a-zа-я])(?=.*[A-ZА-Я])(?=.*\d)(?=.*[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]).{8,}$/;
        if (!passwordRegex.test(password)) {
            await client.query('ROLLBACK');
            return res.status(400).json({
                error: 'Пароль должен содержать минимум 8 символов, заглавную букву, строчную букву, цифру и специальный символ'
            });
        }

        const existingUser = await selectRegister.email(email);
        if (existingUser.rows.length > 0) {
            await client.query('ROLLBACK');
            return res.status(409).json({ error: 'Пользователь с таким email уже существует' });
        }

        const companyResult = await insertRegister.companies({shop_name, display_name});
        const company = companyResult.rows[0];

        const passwordHash = await bcrypt.hash(password, 10);
        const company_id = company.id;
        const userResult = await insertRegister.users({email, passwordHash, company_id});
        const user = userResult.rows[0];
        const user_id = user.id;

        await insertRegister.userProfiles({user_id, company_id, display_name, shop_name, phone});

        await update.companies({user_id, company_id});

        await client.query('COMMIT');

        mail.sendRegisterEmail(email, display_name) 
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

        const result = await selectRegister.emailPlus(email);
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