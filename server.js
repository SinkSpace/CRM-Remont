const express = require('express'); /* подключение express */
const cors = require('cors'); /* подключение cors */
const path = require('path');
const { stringify } = require('querystring');
const fs = require('fs');
const pool = require('./db'); /* подключение БД */
const app = express(); /* создание веб-приложения */
const bcrypt = require('bcrypt');

app.use(express.static(path.join(__dirname, 'public')));
app.use(cors());
app.use(express.json());

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.post('/api/register', async (req, res) => {
    try {
        const { email, password, display_name, shop_name, phone } = req.body;

        if (!email || !password || !display_name) {
            return res.status(400).json({
                error: 'email, password и display_name обязательны'
            });
        }

        if (password.length < 6) {
            return res.status(400).json({
                error: 'Пароль должен быть не короче 6 символов'
            });
        }

        const existingUser = await pool.query(
            'SELECT id FROM users WHERE email = $1',
            [email]
        );

        if (existingUser.rows.length > 0) {
            return res.status(409).json({
                error: 'Пользователь с таким email уже существует'
            });
        }

        const passwordHash = await bcrypt.hash(password, 10);

        const userResult = await pool.query(
            `INSERT INTO users (email, password_hash, role)
             VALUES ($1, $2, $3)
             RETURNING id, email, role, created_at`,
            [email, passwordHash, 'master']
        );

        const user = userResult.rows[0];

        await pool.query(
            `INSERT INTO user_profiles (user_id, display_name, shop_name, phone)
             VALUES ($1, $2, $3, $4)`,
            [user.id, display_name, shop_name || null, phone || null]
        );

        res.status(201).json({
            message: 'Пользователь зарегистрирован',
            user: {
                id: user.id,
                email: user.email,
                role: user.role
            }
        });
    } catch (error) {
        console.error('Ошибка регистрации:', error);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

app.post('/api/login', async (req, res) => {
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
});

app.get('/register', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'register.html'));
})

app.get('/join', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'join.html'));
})

app.get('/track', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'track.html'));
})

app.get('/logs', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'logs.html'));
})

app.get('/settings', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'settings.html'))
})

app.get('/admin', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'admin.html'))
})

app.get('/orders', async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT
                id,
                phone,
                customer,
                worker,
                device,
                model,
                SN AS "SN",
                hasDevice AS "hasDevice",
                hasCharger AS "hasCharger",
                status,
                price,
                pre,
                acceptDate AS "acceptDate",
                deadline,
                crush,
                note
            FROM orders
        `);
        res.json(result.rows);
    } catch (error) {
        console.error('Ошибка при получении заказов:', error);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

app.post('/orders', async (req, res) => {
    try {
        const {
            phone,
            customer,
            worker,
            device,
            model,
            SN,
            hasDevice,
            hasCharger,
            status,
            price,
            pre,
            acceptDate,
            deadline,
            crush,
            note
        } = req.body;

        const result = await pool.query(
            `INSERT INTO orders
            (
                phone,
                customer,
                worker,
                device,
                model,
                SN,
                hasDevice,
                hasCharger,
                status,
                price,
                pre,
                acceptDate,
                deadline,
                crush,
                note
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
            RETURNING *`,
            [
                phone,
                customer,
                worker,
                device,
                model,
                SN,
                hasDevice,
                hasCharger,
                status,
                price,
                pre,
                acceptDate,
                deadline,
                crush,
                note
            ]
        );

        res.status(201).json(result.rows[0]);
    } catch (error) {
        console.error('Ошибка при добавлении заказа:', error);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

app.delete('/orders/:id', async (req, res) => {
    try {
        const id = Number(req.params.id);

        await pool.query(
            'DELETE FROM orders WHERE id = $1',
            [id]
        );

        res.sendStatus(200);
    } catch (error) {
        console.error('Ошибка при удалении заказа:', error);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

app.put('/orders/:id', async (req, res) => {
    try {
        const id = Number(req.params.id);

        const {
            phone,
            customer,
            worker,
            device,
            model,
            SN,
            hasDevice,
            hasCharger,
            status,
            price,
            pre,
            acceptDate,
            deadline,
            crush,
            note
        } = req.body;

        const result = await pool.query(
            `UPDATE orders
             SET phone = $1,
                 customer = $2,
                 worker = $3,
                 device = $4,
                 model = $5,
                 SN = $6,
                 hasDevice = $7,
                 hasCharger = $8,
                 status = $9,
                 price = $10,
                 pre = $11,
                 acceptDate = $12,
                 deadline = $13,
                 crush = $14,
                 note = $15
             WHERE id = $16
             RETURNING
                 id,
                 phone,
                 customer,
                 worker,
                 device,
                 model,
                 SN AS "SN",
                 hasDevice AS "hasDevice",
                 hasCharger AS "hasCharger",
                 status,
                 price,
                 pre,
                 acceptDate AS "acceptDate",
                 deadline,
                 crush,
                 note`,
            [
                phone,
                customer,
                worker,
                device,
                model,
                SN,
                hasDevice,
                hasCharger,
                status,
                price,
                pre,
                acceptDate,
                deadline,
                crush,
                note,
                id
            ]
        );

        res.json(result.rows[0]);
    } catch (error) {
        console.error('Ошибка при обновлении заказа:', error);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

app.get('/api/profile/:id', async (req, res) => {
    try {
        const userId = req.params.id;

        const result = await pool.query(
            `SELECT 
                u.id,
                u.email,
                p.display_name,
                p.shop_name,
                p.phone,
                p.avatar_url
             FROM users u
             LEFT JOIN user_profiles p ON p.user_id = u.id
             WHERE u.id = $1`,
            [userId]
        );

        const user = result.rows[0];

        if (!user) {
            return res.status(404).json({ error: 'Пользователь не найден' });
        }

        res.json(user);

    } catch (error) {
        console.error('Ошибка получения профиля:', error);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

app.post('/api/trackings/create', async (req, res) => {
    try {
        const { tracking_number } = req.body;

        if (!tracking_number) {
            return res.status(400).json({ error: 'tracking_number обязателен' });
        }

        const headers = {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
            'Tracking-Api-Key': '61r0670t-lfis-zy6o-vle8-92umzb1pcloj'
        };

        // 1. Сначала определяем курьера
        const detectResponse = await fetch('https://api.trackingmore.com/v4/couriers/detect', {
            method: 'POST',
            headers,
            body: JSON.stringify({
                tracking_number
            })
        });

        const detectData = await detectResponse.json();

        if (!detectResponse.ok) {
            return res.status(detectResponse.status).json({
                error: 'Не удалось определить службу доставки',
                details: detectData
            });
        }

        const couriers = detectData?.data || [];
        const firstCourier = couriers[0];

        if (!firstCourier?.courier_code) {
            return res.status(400).json({
                error: 'TrackingMore не смог определить courier_code',
                details: detectData
            });
        }

        // 2. Создаём отслеживание уже с реальным courier_code
        const createResponse = await fetch('https://api.trackingmore.com/v4/trackings/create', {
            method: 'POST',
            headers,
            body: JSON.stringify({
                tracking_number,
                courier_code: firstCourier.courier_code
            })
        });

        const createData = await createResponse.json();

        if (!createResponse.ok) {
            return res.status(createResponse.status).json({
                error: 'Не удалось создать отслеживание',
                details: createData
            });
        }

        res.json({
            ok: true,
            courier: firstCourier,
            tracking: createData
        });
    } catch (error) {
        console.error('TrackingMore error:', error);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

app.put('/api/profile/:id', async (req, res) => {
    try {
        const userId = req.params.id;
        const { display_name, shop_name, phone } = req.body;

        if (!display_name) {
            return res.status(400).json({
                error: 'display_name обязателен'
            });
        }

        const result = await pool.query(
            `UPDATE user_profiles
             SET display_name = $1,
                 shop_name = $2,
                 phone = $3
             WHERE user_id = $4
             RETURNING id, user_id, display_name, shop_name, phone, avatar_url, created_at`,
            [
                display_name,
                shop_name || null,
                phone || null,
                userId
            ]
        );

        const profile = result.rows[0];

        if (!profile) {
            return res.status(404).json({
                error: 'Профиль не найден'
            });
        }

        res.json({
            message: 'Профиль обновлён',
            profile
        });
    } catch (error) {
        console.error('Ошибка обновления профиля:', error);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

app.listen(3000, () => {
    console.log('3000');
});