const express = require('express'); /* подключение express */
const cors = require('cors'); /* подключение cors */
const path = require('path');
const { stringify } = require('querystring');
const pool = require('./db'); /* подключение БД */
const app = express(); /* создание веб-приложения */
const bcrypt = require('bcrypt');

require('dotenv').config();
const TrackingMore = process.env.TrackingMore;

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
            note,
            user_id
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

        const order = result.rows[0];

        await writeLog({
            user_id: user_id || null,
            entity_type: 'order',
            entity_id: order.id,
            action: 'create',
            title: `Создан заказ №${order.id}`,
            details: {
                model: order.model,
                customer: order.customer,
                worker: order.worker,
                status: order.status,
                price: order.price
            }
        });

        res.status(201).json(order);
    } catch (error) {
        console.error('Ошибка при добавлении заказа:', error);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

app.delete('/orders/:id', async (req, res) => {
    try {
        const id = Number(req.params.id);

        const beforeResult = await pool.query(
            `SELECT id, customer, worker, model, status, price
             FROM orders
             WHERE id = $1`,
            [id]
        );

        const before = beforeResult.rows[0];

        if (!before) {
            return res.status(404).json({ error: 'Заказ не найден' });
        }

        await pool.query(
            'DELETE FROM orders WHERE id = $1',
            [id]
        );

        await writeLog({
            user_id: null,
            entity_type: 'order',
            entity_id: id,
            action: 'delete',
            title: `Удалён заказ №${id}`,
            details: before
        });

        res.json({ message: 'Заказ удалён' });
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
            note,
            user_id
        } = req.body;

        const beforeResult = await pool.query(
            `SELECT
                id, phone, customer, worker, device, model, SN,
                hasDevice, hasCharger, status, price, pre,
                acceptDate, deadline, crush, note
             FROM orders
             WHERE id = $1`,
            [id]
        );

        const before = beforeResult.rows[0];

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

        const updatedOrder = result.rows[0];

        await writeLog({
            user_id: user_id || null,
            entity_type: 'order',
            entity_id: updatedOrder.id,
            action: 'update',
            title: `Изменён заказ №${updatedOrder.id}`,
            details: {
                before,
                after: updatedOrder
            }
        });

        res.json(updatedOrder);
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

app.get('/api/trackings', async (req, res) => {
    try {
        const localResult = await pool.query(`
            SELECT id, tracking_number, courier_code, title, status_text, created_at
            FROM trackings
            ORDER BY created_at DESC
        `);

        const localTrackings = localResult.rows;

        const headers = {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
            'Tracking-Api-Key': TrackingMore
        };

        const updatedTrackings = [];

        for (const item of localTrackings) {
            try {
                const response = await fetch('https://api.trackingmore.com/v4/trackings/get', {
                    method: 'POST',
                    headers,
                    body: JSON.stringify({
                        tracking_numbers: [item.tracking_number],
                        courier_code: item.courier_code,
                        page: 1,
                        limit: 1
                    })
                });

                const data = await response.json();

                if (!response.ok) {
                    updatedTrackings.push(item);
                    continue;
                }

                const apiItem =
                    data?.data?.items?.[0] ||
                    data?.data?.[0] ||
                    null;

                const freshTitle = apiItem?.title || item.title || 'Посылка';
                const freshStatus = apiItem?.status_text || item.status_text || 'Статус неизвестен';

                const saved = await pool.query(
                    `UPDATE trackings
                     SET title = $1,
                         status_text = $2
                     WHERE id = $3
                     RETURNING id, tracking_number, courier_code, title, status_text, created_at`,
                    [freshTitle, freshStatus, item.id]
                );

                updatedTrackings.push(saved.rows[0]);
            } catch (err) {
                console.error(`Ошибка обновления трека ${item.tracking_number}:`, err);
                updatedTrackings.push(item);
            }
        }

        res.json({ data: updatedTrackings });
    } catch (error) {
        console.error('Ошибка получения отслеживаний:', error);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

app.get('/api/workers/:userId', async (req, res) => {
    try {
        const userId = Number(req.params.userId);

        const result = await pool.query(
            `SELECT
                id,
                user_id,
                name,
                role,
                phone,
                email,
                is_active,
                created_at,
                updated_at
             FROM workers
             WHERE user_id = $1
             ORDER BY id ASC`,
            [userId]
        );

        res.json(result.rows);
    } catch (error) {
        console.error('Ошибка загрузки сотрудников:', error);
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
            Accept: 'application/json',
            'Content-Type': 'application/json',
            'Tracking-Api-Key': TrackingMore
        };

        const detectResponse = await fetch('https://api.trackingmore.com/v4/couriers/detect', {
            method: 'POST',
            headers,
            body: JSON.stringify({ tracking_number })
        });

        const detectData = await detectResponse.json();
        console.log('detectData:', JSON.stringify(detectData, null, 2));

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

        const createResponse = await fetch('https://api.trackingmore.com/v4/trackings/create', {
            method: 'POST',
            headers,
            body: JSON.stringify({
                tracking_number,
                courier_code: firstCourier.courier_code
            })
        });

        const createData = await createResponse.json();
        console.log('createData:', JSON.stringify(createData, null, 2));

        if (!createResponse.ok) {
            return res.status(createResponse.status).json({
                error: 'Не удалось создать отслеживание',
                details: createData
            });
        }

        const trackingItem = createData?.data?.items?.[0] || createData?.data || {};

        console.log('Перед INSERT:', {
            tracking_number,
            courier_code: firstCourier.courier_code,
            title: trackingItem.title || 'Посылка',
            status_text: trackingItem.status_text || 'Создано'
        });

        const saved = await pool.query(
            `INSERT INTO trackings (tracking_number, courier_code, title, status_text)
             VALUES ($1, $2, $3, $4)
             ON CONFLICT (tracking_number)
             DO UPDATE SET
                courier_code = EXCLUDED.courier_code,
                title = EXCLUDED.title,
                status_text = EXCLUDED.status_text
             RETURNING *`,
            [
                tracking_number,
                firstCourier.courier_code,
                trackingItem.title || 'Посылка',
                trackingItem.status_text || 'Создано'
            ]
        );

        console.log('После INSERT:', saved.rows[0]);

        res.json(saved.rows[0]);
    } catch (error) {
        console.error('TrackingMore error full:', error);
        res.status(500).json({
            error: 'Ошибка сервера',
            details: error.message
        });
    }
});

app.put('/api/profile/:id', async (req, res) => {
    try {
        const userId = Number(req.params.id);
        const { display_name, shop_name, phone } = req.body;

        if (!display_name) {
            return res.status(400).json({
                error: 'display_name обязателен'
            });
        }

        const beforeResult = await pool.query(
            `SELECT display_name, shop_name, phone
             FROM user_profiles
             WHERE user_id = $1`,
            [userId]
        );

        const before = beforeResult.rows[0];

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

        await writeLog({
            user_id: userId,
            entity_type: 'profile',
            entity_id: profile.id,
            action: 'update',
            title: 'Изменены настройки компании',
            details: {
                before,
                after: {
                    display_name: profile.display_name,
                    shop_name: profile.shop_name,
                    phone: profile.phone
                }
            }
        });

        res.json({
            message: 'Профиль обновлён',
            profile
        });
    } catch (error) {
        console.error('Ошибка обновления профиля:', error);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

app.put('/api/workers/:id', async (req, res) => {
    try {
        const id = Number(req.params.id);
        const { name, role, phone, email, is_active } = req.body;

        if (!name) {
            return res.status(400).json({
                error: 'name обязателен'
            });
        }

        const result = await pool.query(
            `UPDATE workers
             SET name = $1,
                 role = $2,
                 phone = $3,
                 email = $4,
                 is_active = $5,
                 updated_at = NOW()
             WHERE id = $6
             RETURNING
                id,
                user_id,
                name,
                role,
                phone,
                email,
                is_active,
                created_at,
                updated_at`,
            [
                name.trim(),
                role || 'Сотрудник',
                phone || null,
                email || null,
                Boolean(is_active),
                id
            ]
        );

        const worker = result.rows[0];

        if (!worker) {
            return res.status(404).json({
                error: 'Сотрудник не найден'
            });
        }

        res.json(worker);
    } catch (error) {
        if (error.code === '23505') {
            return res.status(409).json({
                error: 'Сотрудник с таким именем уже существует'
            });
        }

        console.error('Ошибка обновления сотрудника:', error);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

app.put('/api/workers/:id', async (req, res) => {
    try {
        const id = Number(req.params.id);
        const { name, role, phone, email, is_active } = req.body;

        if (!name) {
            return res.status(400).json({
                error: 'name обязателен'
            });
        }

        const result = await pool.query(
            `UPDATE workers
             SET name = $1,
                 role = $2,
                 phone = $3,
                 email = $4,
                 is_active = $5,
                 updated_at = NOW()
             WHERE id = $6
             RETURNING
                id,
                user_id,
                name,
                role,
                phone,
                email,
                is_active,
                created_at,
                updated_at`,
            [
                name.trim(),
                role || 'Сотрудник',
                phone || null,
                email || null,
                Boolean(is_active),
                id
            ]
        );

        const worker = result.rows[0];

        if (!worker) {
            return res.status(404).json({
                error: 'Сотрудник не найден'
            });
        }

        res.json(worker);
    } catch (error) {
        if (error.code === '23505') {
            return res.status(409).json({
                error: 'Сотрудник с таким именем уже существует'
            });
        }

        console.error('Ошибка обновления сотрудника:', error);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

app.get('/api/workers/:userId', async (req, res) => {
    try {
        const userId = Number(req.params.userId);

        const result = await pool.query(
            `SELECT
                id,
                user_id,
                name,
                role,
                phone,
                email,
                is_active,
                created_at,
                updated_at
             FROM workers
             WHERE user_id = $1
             ORDER BY id ASC`,
            [userId]
        );

        res.json(result.rows);
    } catch (error) {
        console.error('Ошибка загрузки сотрудников:', error);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

app.post('/api/workers', async (req, res) => {
    try {
        const { user_id, name, role, phone, email } = req.body;

        if (!user_id || !name) {
            return res.status(400).json({
                error: 'user_id и name обязательны'
            });
        }

        const result = await pool.query(
            `INSERT INTO workers (user_id, name, role, phone, email)
             VALUES ($1, $2, $3, $4, $5)
             RETURNING
                id,
                user_id,
                name,
                role,
                phone,
                email,
                is_active,
                created_at,
                updated_at`,
            [
                user_id,
                name.trim(),
                role || 'Сотрудник',
                phone || null,
                email || null
            ]
        );

        res.status(201).json(result.rows[0]);
    } catch (error) {
        console.error('Ошибка добавления сотрудника:', error);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

app.put('/api/workers/:id', async (req, res) => {
    try {
        const id = Number(req.params.id);
        const { name, role, phone, email, is_active } = req.body;

        if (!name) {
            return res.status(400).json({
                error: 'name обязателен'
            });
        }

        const result = await pool.query(
            `UPDATE workers
             SET name = $1,
                 role = $2,
                 phone = $3,
                 email = $4,
                 is_active = $5,
                 updated_at = NOW()
             WHERE id = $6
             RETURNING
                id,
                user_id,
                name,
                role,
                phone,
                email,
                is_active,
                created_at,
                updated_at`,
            [
                name.trim(),
                role || 'Сотрудник',
                phone || null,
                email || null,
                Boolean(is_active),
                id
            ]
        );

        if (!result.rows[0]) {
            return res.status(404).json({ error: 'Сотрудник не найден' });
        }

        res.json(result.rows[0]);
    } catch (error) {
        console.error('Ошибка обновления сотрудника:', error);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

app.delete('/api/workers/:id', async (req, res) => {
    try {
        const id = Number(req.params.id);

        const result = await pool.query(
            'DELETE FROM workers WHERE id = $1 RETURNING id',
            [id]
        );

        if (!result.rows[0]) {
            return res.status(404).json({ error: 'Сотрудник не найден' });
        }

        res.json({ message: 'Сотрудник удалён' });
    } catch (error) {
        console.error('Ошибка удаления сотрудника:', error);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});


app.get('/api/devices/:userId', async (req, res) => {
    try {
        const userId = Number(req.params.userId);

        const result = await pool.query(
            `SELECT id, user_id, name, is_active, created_at
             FROM devices
             WHERE user_id = $1
             ORDER BY id ASC`,
            [userId]
        );

        res.json(result.rows);
    } catch (error) {
        console.error('Ошибка загрузки устройств:', error);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

app.post('/api/devices', async (req, res) => {
    try {
        const { user_id, name } = req.body;

        if (!user_id || !name) {
            return res.status(400).json({
                error: 'user_id и name обязательны'
            });
        }

        const result = await pool.query(
            `INSERT INTO devices (user_id, name)
             VALUES ($1, $2)
             RETURNING id, user_id, name, is_active, created_at`,
            [user_id, name.trim()]
        );

        res.status(201).json(result.rows[0]);
    } catch (error) {
        if (error.code === '23505') {
            return res.status(409).json({
                error: 'Такое устройство уже существует'
            });
        }

        console.error('Ошибка добавления устройства:', error);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

app.delete('/api/devices/:id', async (req, res) => {
    try {
        const id = Number(req.params.id);

        const result = await pool.query(
            'DELETE FROM devices WHERE id = $1 RETURNING id',
            [id]
        );

        if (!result.rows[0]) {
            return res.status(404).json({
                error: 'Устройство не найдено'
            });
        }

        res.json({ message: 'Устройство удалено' });
    } catch (error) {
        console.error('Ошибка удаления устройства:', error);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

app.get('/api/devices/:userId', async (req, res) => {
    try {
        const userId = Number(req.params.userId);

        const result = await pool.query(
            `SELECT id, user_id, name, is_active, created_at
             FROM devices
             WHERE user_id = $1
             ORDER BY id ASC`,
            [userId]
        );

        res.json(result.rows);
    } catch (error) {
        console.error('Ошибка загрузки устройств:', error);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

app.post('/api/devices', async (req, res) => {
    try {
        const { user_id, name } = req.body;

        if (!user_id || !name) {
            return res.status(400).json({
                error: 'user_id и name обязательны'
            });
        }

        const result = await pool.query(
            `INSERT INTO devices (user_id, name)
             VALUES ($1, $2)
             RETURNING id, user_id, name, is_active, created_at`,
            [user_id, name.trim()]
        );

        res.status(201).json(result.rows[0]);
    } catch (error) {
        if (error.code === '23505') {
            return res.status(409).json({
                error: 'Такое устройство уже существует'
            });
        }

        console.error('Ошибка добавления устройства:', error);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

app.delete('/api/devices/:id', async (req, res) => {
    try {
        const id = Number(req.params.id);

        const result = await pool.query(
            'DELETE FROM devices WHERE id = $1 RETURNING id',
            [id]
        );

        if (!result.rows[0]) {
            return res.status(404).json({
                error: 'Устройство не найдено'
            });
        }

        res.json({ message: 'Устройство удалено' });
    } catch (error) {
        console.error('Ошибка удаления устройства:', error);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

app.get('/api/statuses/:userId', async (req, res) => {
    try {
        const userId = Number(req.params.userId);

        const result = await pool.query(
            `SELECT id, user_id, name, created_at
             FROM statuses
             WHERE user_id = $1
             ORDER BY id ASC`,
            [userId]
        );

        res.json(result.rows);
    } catch (error) {
        console.error('Ошибка загрузки статусов:', error);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

app.post('/api/statuses', async (req, res) => {
    try {
        const { user_id, name } = req.body;

        if (!user_id || !name) {
            return res.status(400).json({
                error: 'user_id и name обязательны'
            });
        }

        const result = await pool.query(
            `INSERT INTO statuses (user_id, name)
             VALUES ($1, $2)
             RETURNING id, user_id, name, created_at`,
            [user_id, name.trim()]
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
});

app.delete('/api/statuses/:id', async (req, res) => {
    try {
        const id = Number(req.params.id);

        const result = await pool.query(
            'DELETE FROM statuses WHERE id = $1 RETURNING id',
            [id]
        );

        if (!result.rows[0]) {
            return res.status(404).json({
                error: 'Статус не найден'
            });
        }

        res.json({ message: 'Статус удалён' });
    } catch (error) {
        console.error('Ошибка удаления статуса:', error);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

async function writeLog({
    user_id = null,
    entity_type,
    entity_id = null,
    action,
    title,
    details = null
}) {
    try {
        await pool.query(
            `INSERT INTO logs (user_id, entity_type, entity_id, action, title, details)
             VALUES ($1, $2, $3, $4, $5, $6)`,
            [
                user_id,
                entity_type,
                entity_id,
                action,
                title,
                details ? JSON.stringify(details) : null
            ]
        );
    } catch (error) {
        console.error('Ошибка записи лога:', error);
    }
}

app.get('/api/logs/:userId', async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT
                l.id,
                l.user_id,
                l.entity_type,
                l.entity_id,
                l.action,
                l.title,
                l.details,
                l.created_at,
                u.email,
                p.display_name
             FROM logs l
             LEFT JOIN users u ON u.id = l.user_id
             LEFT JOIN user_profiles p ON p.user_id = l.user_id
             ORDER BY l.created_at DESC, l.id DESC`
        );

        res.json(result.rows);
    } catch (error) {
        console.error('Ошибка загрузки логов:', error);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

app.listen(3000, () => {
    console.log('3000');
});