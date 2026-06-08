/******** ПОДКЛЮЧЕНИЕ *********/
const express = require('express'); /* подключение express */
const cors = require('cors'); /* подключение cors */
const path = require('path');
const pool = require('./db'); /* подключение БД */
const app = express(); /* создание веб-приложения */
const bcrypt = require('bcrypt');
const fs = require('fs');
const multer = require('multer');
const PizZip = require('pizzip');
const Docxtemplater = require('docxtemplater');
const bwipjs = require('bwip-js');
const dotenv = require('dotenv');

const templatesDir = path.join(__dirname, 'uploads', 'templates');
const generatedDir = path.join(__dirname, 'uploads', 'generated');

/******** НАСТРОЙКИ *********/
const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, templatesDir),
    filename: (req, file, cb) => {
        const ext = path.extname(file.originalname);
        cb(null, `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`);
    }
});

const uploadTemplate = multer({
    storage,
    limits: { fileSize: 10 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
        if (path.extname(file.originalname).toLowerCase() !== '.docx') {
            return cb(new Error('Можно загружать только .docx'));
        }
        cb(null, true);
    }
});

const DEFAULT_STATUSES = [
    'Принят',
    'В работе',
    'Ждёт запчастей',
    'На согласовании',
    'Без ремонта',
    'Сделан',
    'Отменён'
];

const DEFAULT_WORKER = [
    'Админ',
    'Менеджер',
    'Сотрудник'
]

/******** СОЗДАНИЕ ПАПОК *********/
fs.mkdirSync(templatesDir, { recursive: true });
fs.mkdirSync(generatedDir, { recursive: true });

/******** MIDDLEWARE *********/
app.use(express.static(path.join(__dirname, 'public')));
app.use(cors());
app.use(express.json());

/******** СТРАНИЦЫ *********/
app.get('/', (req, res) => { //Главная страница
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/register', (req, res) => { //Регистрация
    res.sendFile(path.join(__dirname, 'public', 'register.html'));
})

app.get('/join', (req, res) => { //Вход
    res.sendFile(path.join(__dirname, 'public', 'join.html'));
})

app.get('/logs', (req, res) => { //Логи
    res.sendFile(path.join(__dirname, 'public', 'logs.html'));
})

app.get('/settings', (req, res) => { //Настройки
    res.sendFile(path.join(__dirname, 'public', 'settings.html'))
})

app.get('/admin', (req, res) => { //Админ-панель
    res.sendFile(path.join(__dirname, 'public', 'admin.html'))
})

app.get('/archive', (req, res) => { //Архив
    res.sendFile(path.join(__dirname, 'public', 'archive.html'))
})

app.get('/start', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'start.html'))
})

app.get('/statistic', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'statistic.html'))
})

/******** ЗАКАЗЫ *********/

/* 1. Создание заказа */
app.post('/orders', async (req, res) => {
    try {
        const { //характеристики заказа
            phone,
            customer,
            worker,
            device,
            model,
            SN,
            status,
            price,
            pre,
            acceptDate,
            deadline,
            crush,
            note,
            user_id,
            company_id
        } = req.body;

        if (!company_id) {
            return res.status(400).json({ error: 'company_id required' }); //если компании не (прямой переход)
        }

        if (!user_id) {
            return res.status(400).json({ error: 'user_id required' }); //если пользователь не авторизован
        }

        await upsertContact(company_id, customer, phone);
        await upsertDevice(company_id, user_id, device);

        const result = await pool.query(
            `INSERT INTO orders
            (
                phone,
                customer,
                worker,
                device,
                model,
                SN,
                status,
                price,
                pre,
                acceptDate,
                deadline,
                crush,
                note,
                user_id,
                company_id
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
                status,
                price,
                pre,
                acceptDate,
                deadline,
                crush,
                note,
                user_id,
                company_id
            ]
        );

        const order = result.rows[0];

        await writeLog({
            company_id,
            user_id,
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

/* 1.1 Получение заказов */
app.get('/orders', async (req, res) => {
    try {
        const { company_id } = req.query;

        if (!company_id) {
            return res.status(400).json({ error: 'company_id required' });
        }

        const result = await pool.query(`
            SELECT
                id,
                phone,
                customer,
                worker,
                device,
                model,
                SN AS "SN",
                status,
                price,
                pre,
                acceptDate AS "acceptDate",
                deadline,
                crush,
                note,
                is_archived,
                archived_at
            FROM orders
            WHERE company_id = $1
              AND is_archived = false
            ORDER BY id DESC
        `, [company_id]);

        res.json(result.rows);
    } catch (error) {
        console.error('Ошибка при получении заказов:', error);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

app.get('/orders/:companyId', async (req, res) => {
    try {
        const companyId = Number(req.params.companyId);

        const result = await pool.query(`
            SELECT
                id,
                phone,
                customer,
                worker,
                device,
                model,
                SN AS "SN",
                status,
                price,
                pre,
                acceptDate AS "acceptDate",
                deadline,
                crush,
                note
            FROM orders
            WHERE company_id = $1
            ORDER BY id DESC
        `, [companyId]);

        res.json(result.rows);
    } catch (error) {
        console.error('Ошибка при получении заказов:', error);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

/* 1.2 Обновление заказа */
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
            status,
            price,
            pre,
            acceptDate,
            deadline,
            crush,
            note,
            user_id,
            company_id
        } = req.body;

        if (!company_id) {
            return res.status(400).json({ error: 'company_id required' });
        }

        const beforeResult = await pool.query(
            `SELECT
                id, phone, customer, worker, device, model, SN,
                status, price, pre,
                acceptDate, deadline, crush, note
             FROM orders
             WHERE id = $1 AND company_id = $2`,
            [id, company_id]
        );

        const before = beforeResult.rows[0];

        await upsertContact(company_id, customer, phone);
        await upsertDevice(company_id, user_id, device);

        const result = await pool.query(
            `UPDATE orders
             SET phone = $1,
                 customer = $2,
                 worker = $3,
                 device = $4,
                 model = $5,
                 SN = $6,
                 status = $7,
                 price = $8,
                 pre = $9,
                 acceptDate = $10,
                 deadline = $11,
                 crush = $12,
                 note = $13
             WHERE id = $14 AND company_id = $15
             RETURNING
                 id,
                 phone,
                 customer,
                 worker,
                 device,
                 model,
                 SN AS "SN",
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
                status,
                price,
                pre,
                acceptDate,
                deadline,
                crush,
                note,
                id,
                company_id
            ]
        );

        const updatedOrder = result.rows[0];

        await writeLog({
            company_id,
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

/* 1.4 Архивация */
app.put('/api/orders/:id/archive', async (req, res) => {
    try {
        const id = Number(req.params.id);
        const { company_id, user_id } = req.body;

        if (!company_id) {
            return res.status(400).json({ error: 'company_id required' });
        }

        const beforeResult = await pool.query(
            `SELECT id, customer, worker, model, status, price, is_archived
             FROM orders
             WHERE id = $1 AND company_id = $2`,
            [id, company_id]
        );

        const before = beforeResult.rows[0];

        if (!before) {
            return res.status(404).json({ error: 'Заказ не найден' });
        }

        const result = await pool.query(
            `UPDATE orders
             SET is_archived = true,
                 archived_at = NOW()
             WHERE id = $1 AND company_id = $2
             RETURNING *`,
            [id, company_id]
        );

        await writeLog({
            company_id,
            user_id: user_id || null,
            entity_type: 'order',
            entity_id: id,
            action: 'archive',
            title: `Заказ №${id} отправлен в архив`,
            details: {
                before,
                after: result.rows[0]
            }
        });

        res.json(result.rows[0]);
    } catch (error) {
        console.error('Ошибка архивации заказа:', error);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

/* 1.4.1 Загрузка архива */
app.get('/api/archive/:companyId', async (req, res) => {
    try {
        const companyId = Number(req.params.companyId);

        const result = await pool.query(`
            SELECT
                id,
                phone,
                customer,
                worker,
                device,
                model,
                SN AS "SN",
                status,
                price,
                pre,
                acceptDate AS "acceptDate",
                deadline,
                crush,
                note,
                is_archived,
                archived_at
                FROM orders
                WHERE company_id = $1
                AND is_archived = true
                ORDER BY archived_at DESC NULLS LAST, id DESC
                `, [companyId]);

                res.json(result.rows);
    } catch (error) {
        console.error('Ошибка загрузки архива:', error);
        res.status(500).json({error: 'Ошибка сервера'});
    }
});

/* 1.5 Восстановление */
app.put('/api/orders/:id/unarchive', async (req, res) => {
    try {
        const id = Number(req.params.id);
        const { company_id, user_id } = req.body;

        if (!company_id) {
            return res.status(400).json({ error: 'company_id required' });
        }

        const beforeResult = await pool.query(
            `SELECT id, customer, worker, model, status, price, is_archived
             FROM orders
             WHERE id = $1 AND company_id = $2`,
            [id, company_id]
        );

        const before = beforeResult.rows[0];

        if (!before) {
            return res.status(404).json({ error: 'Заказ не найден' });
        }

        const result = await pool.query(
            `UPDATE orders
             SET is_archived = false,
                 archived_at = NULL
             WHERE id = $1 AND company_id = $2
             RETURNING *`,
            [id, company_id]
        );

        await writeLog({
            company_id,
            user_id: user_id || null,
            entity_type: 'order',
            entity_id: id,
            action: 'unarchive',
            title: `Заказ №${id} восстановлен из архива`,
            details: {
                before,
                after: result.rows[0]
            }
        });

        res.json(result.rows[0]);
    } catch (error) {
        console.error('Ошибка восстановления заказа:', error);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

/******** АВТОРИЗАЦИЯ *********/

/* 2. Регистрация */
app.post('/api/register', async (req, res) => {
    const client = await pool.connect();

    const settingsResult = await client.query(
        'SELECT registration_enabled FROM system_settings WHERE id = 1'
    );

    if (settingsResult.rows[0]?.registration_enabled === false) {
        await client.query('ROLLBACK');
        return res.status(403).json({ error: 'Регистрация временно отключена' });
    }

    try {
        await client.query('BEGIN');

        const { email, password, display_name, shop_name, phone } = req.body;

        if (!email || !password || !display_name) {
            await client.query('ROLLBACK');
            return res.status(400).json({ error: 'email, password и display_name обязательны' });
        }

        const existingUser = await client.query(
            'SELECT id FROM users WHERE email = $1',
            [email]
        );

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
});

/* 2.1 Вход */
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
});

/******** ПРОФИЛЬ *********/

/* 3. Получение профиля */
app.get('/api/profile/:id', async (req, res) => {
    try {
        const userId = req.params.id;

        const result = await pool.query(
            `SELECT 
                u.id,
                u.email,
                p.display_name,
                p.shop_name,
                p.city,
                p.address,
                p.phone,
                p.avatar_url,
                c.work_days,
                c.work_time_start,
                c.work_time_end
            FROM users u
            LEFT JOIN user_profiles p ON p.user_id = u.id
            LEFT JOIN companies c ON c.id = u.company_id
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

/* 3.1 Обновление профиля */
app.put('/api/profile/:id', async (req, res) => {
    try {
        const userId = Number(req.params.id);
        const {
            display_name,
            shop_name,
            city,
            address,
            phone,
            work_days,
            work_time_start,
            work_time_end
        } = req.body;

        if (!display_name) {
            return res.status(400).json({
                error: 'display_name обязателен'
            });
        }

        const userResult = await pool.query(
            `SELECT company_id FROM users WHERE id = $1`,
            [userId]
        );

        if (userResult.rows.length === 0) {
            return res.status(404).json({ error: 'Пользователь не найден' });
        }

        const company_id = userResult.rows[0].company_id;

        const beforeResult = await pool.query(
            `SELECT display_name, shop_name, city, address, phone
            FROM user_profiles
            WHERE user_id = $1`,
            [userId]
        );

        const before = beforeResult.rows[0];

        const result = await pool.query(
            `UPDATE user_profiles
            SET display_name = $1,
                shop_name = $2,
                city = $3,
                address = $4,
                phone = $5
            WHERE user_id = $6
            RETURNING id, user_id, company_id, display_name, shop_name, city, address, phone, avatar_url, created_at`,
            [
                display_name,
                shop_name || null,
                city || null,
                address || null,
                phone || null,
                userId
            ]
        );

        await pool.query(
            `UPDATE companies
            SET work_days = $1::jsonb,
                work_time_start = $2,
                work_time_end = $3
            WHERE id = $4`,
            [
                JSON.stringify(Array.isArray(work_days) ? work_days : []),
                work_time_start || null,
                work_time_end || null,
                company_id
            ]
        );

        const profile = result.rows[0];

        if (!profile) {
            return res.status(404).json({
                error: 'Профиль не найден'
            });
        }

        await writeLog({
            company_id,
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
                    city: profile.city,
                    address: profile.address,
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

/******** СОТРУДНИКИ *********/

/* 4. Получение сотрудников */
app.get('/api/workers/:companyId', async (req, res) => {
    try {
        const companyId = Number(req.params.companyId);

        const result = await pool.query(
            `SELECT
                id,
                user_id,
                company_id,
                name,
                role,
                phone,
                email,
                is_active,
                created_at,
                updated_at
             FROM workers
             WHERE company_id = $1
             ORDER BY id ASC`,
            [companyId]
        );

        res.json(result.rows);
    } catch (error) {
        console.error('Ошибка загрузки сотрудников:', error);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

/* 4.1 Добавление */
app.post('/api/workers', async (req, res) => {
    try {
        const { company_id, user_id, name, role, phone, email } = req.body;

        if (!company_id || !name) {
            return res.status(400).json({
                error: 'company_id и name обязательны'
            });
        }

        const result = await pool.query(
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
            ]
        );

        res.status(201).json(result.rows[0]);
    } catch (error) {
        console.error('Ошибка добавления сотрудника:', error);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

/* 4.2 Редактирование */
app.put('/api/workers/:id', async (req, res) => {
    try {
        const id = Number(req.params.id);
        const { company_id, name, role, phone, email, is_active } = req.body;

        if (!company_id || !name) {
            return res.status(400).json({
                error: 'company_id и name обязательны'
            });
        }

        const checkResult = await pool.query(
            'SELECT id FROM workers WHERE id = $1 AND company_id = $2',
            [id, company_id]
        );

        if (!checkResult.rows[0]) {
            return res.status(404).json({ error: 'Сотрудник не найден или доступ запрещён' });
        }

        const result = await pool.query(
            `UPDATE workers
             SET name = $1,
                 role = $2,
                 phone = $3,
                 email = $4,
                 is_active = $5,
                 updated_at = NOW()
             WHERE id = $6 AND company_id = $7
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
                name.trim(),
                role || 'Сотрудник',
                phone || null,
                email || null,
                Boolean(is_active),
                id,
                company_id
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

/* 4.3 Удаление */
app.delete('/api/workers/:id', async (req, res) => {
    try {
        const id = Number(req.params.id);
        const { company_id } = req.body;

        if (!company_id) {
            return res.status(400).json({ error: 'company_id обязателен' });
        }

        const result = await pool.query(
            'DELETE FROM workers WHERE id = $1 AND company_id = $2 RETURNING id',
            [id, company_id]
        );

        if (!result.rows[0]) {
            return res.status(404).json({ error: 'Сотрудник не найден или доступ запрещён' });
        }

        res.json({ message: 'Сотрудник удалён' });
    } catch (error) {
        console.error('Ошибка удаления сотрудника:', error);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

/******** УСТРОЙСТВА *********/

/* 5.1 Получение */
app.get('/api/devices/:companyId', async (req, res) => {
    try {
        const companyId = Number(req.params.companyId);

        const result = await pool.query(
            `SELECT id, user_id, company_id, name, is_active, created_at
             FROM devices
             WHERE company_id = $1
             ORDER BY id ASC`,
            [companyId]
        );

        res.json(result.rows);
    } catch (error) {
        console.error('Ошибка загрузки устройств:', error);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

/* 5.2 Добавление */
app.post('/api/devices', async (req, res) => {
    try {
        const { company_id, user_id, name } = req.body;

        if (!company_id || !name) {
            return res.status(400).json({
                error: 'company_id и name обязательны'
            });
        }

        const result = await pool.query(
            `INSERT INTO devices (user_id, company_id, name)
             VALUES ($1, $2, $3)
             RETURNING id, user_id, company_id, name, is_active, created_at`,
            [user_id || null, company_id, name.trim()]
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

/* 5.3 Удаление */
app.delete('/api/devices/:id', async (req, res) => {
    try {
        const id = Number(req.params.id);
        const { company_id } = req.body;

        if (!company_id) {
            return res.status(400).json({ error: 'company_id обязателен' });
        }

        const result = await pool.query(
            'DELETE FROM devices WHERE id = $1 AND company_id = $2 RETURNING id',
            [id, company_id]
        );

        if (!result.rows[0]) {
            return res.status(404).json({
                error: 'Устройство не найдено или доступ запрещён'
            });
        }

        res.json({ message: 'Устройство удалено' });
    } catch (error) {
        console.error('Ошибка удаления устройства:', error);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

/******** СТАТУСЫ *********/

/* 6.1 Получение */
app.get('/api/statuses/:companyId', async (req, res) => {
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
});

/* 6.2 Добавление */
app.post('/api/statuses', async (req, res) => {
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
});

/* 6.3 Удаление */
app.delete('/api/statuses/:id', async (req, res) => {
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
});

/******** КОНТАКТЫ *********/

app.get('/api/contacts/:companyId', async (req, res) => {
    try {
        const companyId = Number(req.params.companyId);
        const q = String(req.query.q || '').trim();

        const result = await pool.query(
            `SELECT id, customer_name, phone, phone_normalized, last_used_at
             FROM contacts
             WHERE company_id = $1
               AND (
                    $2 = ''
                    OR customer_name ILIKE '%' || $2 || '%'
                    OR phone ILIKE '%' || $2 || '%'
                    OR phone_normalized ILIKE '%' || $2 || '%'
               )
             ORDER BY last_used_at DESC, id DESC
             LIMIT 10`,
            [companyId, q]
        );

        res.json(result.rows);
    } catch (error) {
        console.error('Ошибка загрузки контактов:', error);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

/******** ЛОГИ *********/
app.get('/api/logs/:companyId', async (req, res) => {
    try {
        const companyId = Number(req.params.companyId);

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
            WHERE l.company_id = $1
            ORDER BY l.created_at DESC, l.id DESC`,
            [companyId]
        );

        res.json(result.rows);
    } catch (error) {
        console.error('Ошибка загрузки логов:', error);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

/******** ШАБЛОНЫ ДОКУМЕНТОВ *********/

/* 9.1 Получение */

app.post('/api/templates/upload', uploadTemplate.single('template'), async (req, res) => {
    try {
        const { company_id, user_id, name, type } = req.body;
        const originalName = Buffer.from(req.file.originalname, 'latin1').toString('utf8');

        if (!company_id || !name || !req.file) {
            return res.status(400).json({ error: 'company_id, name и template обязательны' });
        }

        const result = await pool.query(
            `INSERT INTO document_templates (company_id, user_id, name, file_path, original_name, type)
             VALUES ($1, $2, $3, $4, $5, $6)
             RETURNING *`,
            [company_id, user_id || null, name.trim(), req.file.path, originalName, type || 'act']
        );

        res.status(201).json(result.rows[0]);
    } catch (error) {
        console.error('Ошибка загрузки шаблона:', error);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

app.get('/api/templates/:companyId', async (req, res) => {
    try {
        const companyId = Number(req.params.companyId);
        const type = req.query.type || null;

        const result = await pool.query(
            `SELECT id, company_id, user_id, name, original_name, type, created_at
             FROM document_templates
             WHERE company_id = $1
               AND ($2::text IS NULL OR type = $2)
             ORDER BY id DESC`,
            [companyId, type]
        );

        res.json(result.rows);
    } catch (error) {
        console.error('Ошибка загрузки шаблонов:', error);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

/* 9.2 Удаление */

app.delete('/api/templates/:id', async (req, res) => {
    try {
        const id = Number(req.params.id);
        const { company_id } = req.body;

        const result = await pool.query(
            `DELETE FROM document_templates
             WHERE id = $1 AND company_id = $2
             RETURNING *`,
            [id, company_id]
        );

        if (!result.rows[0]) {
            return res.status(404).json({ error: 'Шаблон не найден' });
        }

        const filePath = result.rows[0].file_path;
        if (filePath && fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
        }

        res.json({ message: 'Шаблон удалён' });
    } catch (error) {
        console.error('Ошибка удаления шаблона:', error);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

/******** ШАБЛОНЫ ДОКУМЕНТОВ *********/

/* 9.1 Получение */

app.post('/api/templates/upload', uploadTemplate.single('template'), async (req, res) => {
    try {
        const { company_id, user_id, name, type } = req.body;
        const originalName = Buffer.from(req.file.originalname, 'latin1').toString('utf8');

        if (!company_id || !name || !req.file) {
            return res.status(400).json({ error: 'company_id, name и template обязательны' });
        }

        const result = await pool.query(
            `INSERT INTO document_templates (company_id, user_id, name, file_path, original_name, type)
             VALUES ($1, $2, $3, $4, $5, $6)
             RETURNING *`,
            [company_id, user_id || null, name.trim(), req.file.path, originalName, type || 'act']
        );

        res.status(201).json(result.rows[0]);
    } catch (error) {
        console.error('Ошибка загрузки шаблона:', error);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

app.get('/api/templates/:companyId', async (req, res) => {
    try {
        const companyId = Number(req.params.companyId);
        const { type } = req.query;

        const result = await pool.query(
            `SELECT id, company_id, user_id, name, original_name, created_at
             FROM document_templates
             WHERE company_id = $1
             AND ($2::text is NULL OR type = $2)
             ORDER BY id DESC`,
            [companyId]
        );

        res.json(result.rows);
    } catch (error) {
        console.error('Ошибка загрузки шаблонов:', error);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

/* 9.2 Удаление */

app.delete('/api/templates/:id', async (req, res) => {
    try {
        const id = Number(req.params.id);
        const { company_id } = req.body;

        const result = await pool.query(
            `DELETE FROM document_templates
             WHERE id = $1 AND company_id = $2
             RETURNING *`,
            [id, company_id]
        );

        if (!result.rows[0]) {
            return res.status(404).json({ error: 'Шаблон не найден' });
        }

        const filePath = result.rows[0].file_path;
        if (filePath && fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
        }

        res.json({ message: 'Шаблон удалён' });
    } catch (error) {
        console.error('Ошибка удаления шаблона:', error);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

/* 10.1 Статистика */

app.get('/stats', async (req, res) => {
    const { type, date, company_id } = req.query;

    if (!company_id) {
        return res.status(400).json({ error: 'company_id required' });
    }

    try {
        let result;

        if (type === 'day') {
            result = await pool.query(`
                SELECT COALESCE(SUM(price), 0) AS income
                FROM orders
                WHERE company_id = $1
                  AND DATE(created_at) = $2
            `, [company_id, date]);
        }

        if (type === 'month') {
            result = await pool.query(`
                SELECT COALESCE(SUM(price), 0) AS income
                FROM orders
                WHERE company_id = $1
                  AND DATE_TRUNC('month', created_at) = DATE_TRUNC('month', $2::date)
            `, [company_id, date]);
        }

        res.json(result.rows[0]);
    } catch (err) {
        console.log(err);
        res.status(500).send('Ошибка сервера');
    }
});

app.get('/stats/workers/day', async (req, res) => {
    const { date, company_id } = req.query;

    if (!company_id) {
        return res.status(400).json({ error: 'company_id required' });
    }

    const result = await pool.query(`
        SELECT 
            COALESCE(worker, 'Без сотрудника') AS name,
            COALESCE(SUM(price), 0) AS income,
            COUNT(*) AS orders_count
        FROM orders
        WHERE company_id = $1
          AND DATE(created_at) = $2
        GROUP BY worker
        ORDER BY income DESC
    `, [company_id, date]);

    res.json(result.rows);
});

app.get('/stats/workers/month', async (req, res) => {
    const { date, company_id } = req.query;

    if (!company_id) {
        return res.status(400).json({ error: 'company_id required' });
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
});

/* 10.2 Статистика конкретного работника за день */

app.get('/stats/workers/day', async (req, res) => {

    const date = req.query.date;

    const result = await pool.query(`
        SELECT 
            worker,
            SUM(price) AS income,
            COUNT(*) AS orders_count
        FROM orders
        WHERE DATE(created_at) = $1
        GROUP BY worker
        ORDER BY income DESC
    `, [date]);

    res.json(result.rows);
});

/* 10.3 Статистика конкретного работника за месяц */

app.get('/stats/workers/month', async (req, res) => {

    const date = req.query.date;

    const result = await pool.query(`
        SELECT 
            worker,
            SUM(price) AS income,
            COUNT(*) AS orders_count
        FROM orders
        WHERE DATE_TRUNC('month', created_at) = DATE_TRUNC('month', $1::date)
        GROUP BY worker
        ORDER BY income DESC
    `, [date]);

    res.json(result.rows);
});

/******** ГЕНЕРАЦИЯ ДОКУМЕНТОВ *********/

/* 10.1 Штрихкод */

app.get('/api/barcode/:text', async (req, res) => {
    try {
        const png = await bwipjs.toBuffer({
            bcid: 'code128',
            text: String(req.params.text),
            scale: 3,
            height: 12,
            includetext: false
        });

        res.type('png');
        res.send(png);
    } catch (error) {
        console.error('Ошибка генерации штрихкода:', error);
        res.status(500).json({ error: 'Не удалось сгенерировать штрихкод' });
    }
});

/* 10.2 Документ */

app.post('/api/documents/generate', async (req, res) => {
    try {
        const { company_id, order_id, template_id, user_id } = req.body;

        if (!company_id || !order_id || !template_id) {
            return res.status(400).json({ error: 'company_id, order_id, template_id обязательны' });
        }

        const templateResult = await pool.query(
            `SELECT *
             FROM document_templates
             WHERE id = $1 AND company_id = $2`,
            [template_id, company_id]
        );

        const template = templateResult.rows[0];
        if (!template) {
            return res.status(404).json({ error: 'Шаблон не найден' });
        }

        const data = await buildTemplateData(company_id, order_id);

        const content = fs.readFileSync(template.file_path, 'binary');
        const zip = new PizZip(content);

        const doc = new Docxtemplater(zip, {
            paragraphLoop: true,
            linebreaks: true,
            delimiters: {
                start: '${',
                end: '}'
            }
        });

        doc.render(data);

        const buffer = doc.getZip().generate({
            type: 'nodebuffer',
            compression: 'DEFLATE'
        });

        const outputPath = path.join(
            generatedDir,
            `document-${company_id}-${order_id}-${template_id}-${Date.now()}.docx`
        );

        fs.writeFileSync(outputPath, buffer);

        await pool.query(
            `INSERT INTO generated_documents (company_id, order_id, template_id, created_by, file_path)
             VALUES ($1, $2, $3, $4, $5)`,
            [company_id, order_id, template_id, user_id || null, outputPath]
        );

        res.download(outputPath);
    } catch (error) {
        console.error('Ошибка генерации документа:', error);
        res.status(500).json({
            error: 'Ошибка генерации документа',
            details: error.message
        });
    }
});

/* 10.1 Взаимодействие с ИИ */

process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
const axios = require("axios");
const qs = require("qs");
const { v4: uuidv4 } = require("uuid");

dotenv.config();

app.use(express.static("public"));

const OAUTH_URL =
  "https://ngw.devices.sberbank.ru:9443/api/v2/oauth";

const CHAT_URL =
  "https://gigachat.devices.sberbank.ru/api/v1/chat/completions";

async function getToken() {
  const data = qs.stringify({
    scope: "GIGACHAT_API_PERS",
  });

  const res = await axios({
    method: "post",
    url: OAUTH_URL,
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Accept: "application/json",
      RqUID: uuidv4(),
      Authorization: `Basic ${process.env.GIGA_CHAT_CREDENTIALS}`,
    },
    data,
  });

  return res.data.access_token;
}

async function chat(token, message) {
    const settingsResult = await pool.query(
        'SELECT ai_prompt, ai_model, ai_enabled FROM system_settings WHERE id = 1'
    );

    const settings = settingsResult.rows[0] || {};

    if (settings.ai_enabled === false) {
        throw new Error('ИИ отключён администратором');
    }

    const finalPrompt = message;

    const res = await axios({
        method: 'post',
        url: CHAT_URL,
        headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
            Authorization: `Bearer ${token}`,
        },
        data: {
            model: settings.ai_model || 'GigaChat-2',
            messages: [
                {
                    role: 'user',
                    content: finalPrompt,
                },
            ],
            profanity_check: true,
        },
    });

    return res.data;
}

app.post("/chat", async (req, res) => {
  try {
    const { message } = req.body;

    const token = await getToken();
    const response = await chat(token, message);

    const text =
      response?.choices?.[0]?.message?.content || response;

    res.json({ text });
  } catch (err) {
    console.log("ERROR STATUS:", err.response?.status);
    console.log("ERROR DATA:", err.response?.data);

    res.status(500).json({
      error: err.response?.data || err.message,
    });
  }
});

/******** ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ *********/

/* normalizePhone */
function normalizePhone(phone = '') {
    return String(phone).replace(/\D/g, '');
}

/* writeLog */
async function writeLog({
    company_id,
    user_id = null,
    entity_type,
    entity_id = null,
    action,
    title,
    details = null
}) {
    try {
        await pool.query(
            `INSERT INTO logs (company_id, user_id, entity_type, entity_id, action, title, details)
             VALUES ($1, $2, $3, $4, $5, $6, $7)`,
            [
                company_id,
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

/* upsertDevice */
async function upsertDevice(company_id, user_id, name) {
    const trimmed = String(name || '').trim();
    if (!trimmed) return null;

    const existing = await pool.query(
        `SELECT id, name
         FROM devices
         WHERE company_id = $1
           AND LOWER(name) = LOWER($2)
         LIMIT 1`,
        [company_id, trimmed]
    );

    if (existing.rows[0]) return existing.rows[0];

    const result = await pool.query(
        `INSERT INTO devices (company_id, user_id, name)
         VALUES ($1, $2, $3)
         RETURNING *`,
        [company_id, user_id || null, trimmed]
    );

    return result.rows[0];
}

/* upsertContact */
async function upsertContact(company_id, customer_name, phone) {
    const phone_normalized = normalizePhone(phone);

    if (!customer_name || !phone_normalized) return null;

    const existing = await pool.query(
        `SELECT id
         FROM contacts
         WHERE company_id = $1 AND phone_normalized = $2`,
        [company_id, phone_normalized]
    );

    if (existing.rows[0]) {
        const result = await pool.query(
            `UPDATE contacts
             SET customer_name = $1,
                 phone = $2,
                 updated_at = NOW(),
                 last_used_at = NOW()
             WHERE id = $3
             RETURNING *`,
            [customer_name, phone, existing.rows[0].id]
        );
        return result.rows[0];
    }

    const result = await pool.query(
        `INSERT INTO contacts (company_id, customer_name, phone, phone_normalized)
         VALUES ($1, $2, $3, $4)
         RETURNING *`,
        [company_id, customer_name, phone, phone_normalized]
    );

    return result.rows[0];
}

/* formatDate */
function formatDate(value) {
    if (!value) return '';
    const d = new Date(value);
    if (isNaN(d)) return '';
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}.${month}.${year}`;
}

/* formatMoney */
function formatMoney(value) {
    const num = Number(value);
    if (!num) return '0';
    return String(num);
}

/* addDays */
function addDays(dateValue, days) {
    const d = new Date(dateValue);
    if (isNaN(d)) return '';
    d.setDate(d.getDate() + days);
    return d;
}

/* ensureDefaultStatuses */
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

/* generateBarcodeBase64 */
async function generateBarcodeBase64(text) {
    const png = await bwipjs.toBuffer({
        bcid: 'code128',
        text: String(text),
        scale: 3,
        height: 12,
        includetext: false
    });

    return png.toString('base64');
}

/* buildTemplateData */
async function buildTemplateData(company_id, order_id) {
    const orderResult = await pool.query(
        `SELECT *
         FROM orders
         WHERE id = $1 AND company_id = $2`,
        [order_id, company_id]
    );

    const order = orderResult.rows[0];
    if (!order) {
        throw new Error('Заказ не найден');
    }

    const profileResult = await pool.query(
        `SELECT display_name, shop_name, city, address, phone
         FROM user_profiles
         WHERE company_id = $1
         ORDER BY id ASC
         LIMIT 1`,
        [company_id]
    );

    const profile = profileResult.rows[0] || {};

    const warrantyDays = 30;
    const warrantyEnd = order.acceptdate ? addDays(order.acceptdate, warrantyDays) : null;

    return {
        ШтрихкодДокумента: String(order.id),
        НазваниеКомпании: profile.display_name || '',
        ЮрНаименованиеКомпании: profile.shop_name || profile.display_name || '',
        ГородРасположенияКомпании: profile.city || '',
        АдресКомпании: profile.address || '',
        РежимРаботы: '',
        ТелефонКомпании: profile.phone || '',

        НомерДокумента: order.id,
        ДатаДокумента: formatDate(order.acceptdate || order.acceptDate),
        ДатаВыдачи: formatDate(order.acceptdate || order.acceptDate),

        ФиоЗаказчика: order.customer || '',
        КонтактыЗаказчика: order.phone || '',
        Устройство: order.device || '',
        МодельУстройства: order.model || '',
        СерийныйНомерУстройства: order.sn || order.SN || '',
        ОписаниеНеисправности: order.crush || '',
        ВыполненнаяРабота: order.note || '',
        ФиоИсполнителя: order.worker || '',

        ИтоговаяСтоимость: formatMoney(order.price),
        ПримернаяСтоимостьРемонта: formatMoney(order.price),
        Предоплата: formatMoney(order.pre),
        СрокРемонта: `${order.deadline || 0} дней`,
        ДатаОкончанияРемонта: formatDate(addDays(new Date(), Number(order.deadline) || 0)),
        ДатаОкончанияГарантии: formatDate(warrantyEnd),
        СрокГарантии: `${warrantyDays} дней`,
        ГарантийныеОбязательства: true,

        КомплектацияУстройства: '',
        Примечание: order.note || ''
    };
}

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

app.get('/api/ai/settings', async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT ai_prompt, ai_enabled
             FROM system_settings
             WHERE id = 1`
        );

        res.json(result.rows[0] || {});
    } catch (error) {
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

app.put('/api/admin/users/:id/active', async (req, res) => {
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
});

app.get('/api/admin/dashboard', async (req, res) => {
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
});

app.put('/api/admin/settings', async (req, res) => {
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
});

/******** ЗАПУСК СЕРВЕРА *********/

const PORT = '80';
const HOST = '0.0.0.0';

app.listen(PORT, HOST, () => {
    console.log('Сервер запущен, домен http://crmsink.ru');
});
