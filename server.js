const express = require('express'); /* подключение express */
const cors = require('cors'); /* подключение cors */
const path = require('path');
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
    const client = await pool.connect();

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

app.get('/register', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'register.html'));
})

app.get('/join', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'join.html'));
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

app.get('/archive', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'archive.html'))
})

app.post('/orders', async (req, res) => {
    try {
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

        if (!user_id) {
            return res.status(400).json({ error: 'user_id required' });
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

app.delete('/orders/:id', async (req, res) => {
    try {
        const id = Number(req.params.id);
        const company_id = Number(req.query.company_id || req.body.company_id);

        if (!company_id) {
            return res.status(400).json({ error: 'company_id required' });
        }

        const beforeResult = await pool.query(
            `SELECT id, customer, worker, model, status, price
             FROM orders
             WHERE id = $1 AND company_id = $2`,
            [id, company_id]
        );

        const before = beforeResult.rows[0];

        if (!before) {
            return res.status(404).json({ error: 'Заказ не найден' });
        }

        await pool.query(
            'DELETE FROM orders WHERE id = $1 AND company_id = $2',
            [id, company_id]
        );

        await writeLog({
            company_id,
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

app.put('/api/profile/:id', async (req, res) => {
    try {
        const userId = Number(req.params.id);
        const { display_name, shop_name, city, address, phone } = req.body;

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

function normalizePhone(phone = '') {
    return String(phone).replace(/\D/g, '');
}

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

const DEFAULT_STATUSES = [
    'Принят',
    'В работе',
    'Ждёт запчастей',
    'На согласовании',
    'Без ремонта',
    'Сделан',
    'Отменён'
];

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
}

app.listen(3000, () => {
    console.log('3000');
});