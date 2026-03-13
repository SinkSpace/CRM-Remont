const express = require('express'); /* подключение express */
const cors = require('cors'); /* подключение cors */
const path = require('path');
const { stringify } = require('querystring');
const pool = require('./db'); /* подключение БД */
const app = express(); /* создание веб-приложения */

app.use(express.static(path.join(__dirname, 'public')));
app.use(cors());
app.use(express.json());

const dataArchive = path.join(__dirname, 'archive.json');

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/archive', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'archive.html'));
})

app.get('/orders', async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT
                id,
                device,
                model,
                status,
                crush,
                price,
                note,
                worker,
                acceptdate AS "acceptDate",
                deadline
            FROM orders
        `);
        res.json(result.rows);
    } catch (error) {
        console.error('Ошибка при получении заказов:', error);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

app.get('/archive-data', (req, res) => {
    const archiveFile = path.join(__dirname, 'archive.json');

    if (!fs.existsSync(archiveFile)) {
        return res.json([]);
    }

    const archive = JSON.parse(fs.readFileSync(archiveFile, 'utf8'));
    res.json(archive);
});

app.post('/orders', async (req, res) => {
    try {
        const {
            device,
            model,
            status,
            crush,
            price,
            note,
            worker,
            acceptDate,
            deadline
        } = req.body;

        const result = await pool.query(
            `INSERT INTO orders
            (device, model, status, crush, price, note, worker, acceptdate, deadline)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
            RETURNING
                id,
                device,
                model,
                status,
                crush,
                price,
                note,
                worker,
                acceptdate AS "acceptDate",
                deadline`,
            [device, model, status, crush, price, note, worker, acceptDate, deadline]
        );

        res.status(201).json({
            message: 'Задача добавлена',
            task: result.rows[0]
        });
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
            device,
            model,
            status,
            crush,
            price,
            note,
            worker,
            acceptDate,
            deadline
        } = req.body;

        const result = await pool.query(
            `UPDATE orders
             SET device = $1,
                 model = $2,
                 status = $3,
                 crush = $4,
                 price = $5,
                 note = $6,
                 worker = $7,
                 acceptdate = $8,
                 deadline = $9
             WHERE id = $10
             RETURNING id, device, model, status, crush, price, note, worker,
                       acceptdate AS "acceptDate", deadline`,
            [
                device,
                model,
                status,
                crush,
                price,
                note,
                worker,
                acceptDate,
                deadline,
                id
            ]
        );

        res.json(result.rows[0]);
    } catch (error) {
        console.error('Ошибка при обновлении заказа:', error);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

app.post('/move', (req, res) => {
    const archiveFile = path.join(__dirname, 'archive.json');
    const newArchive = req.body;
    let archive = [];
    if (fs.existsSync(archiveFile)) archive = JSON.parse(fs.readFileSync(archiveFile, 'utf8'));
    archive.push(newArchive);
    fs.writeFileSync(archiveFile, JSON.stringify(archive, null, 2));
    res.status(201).json({ message: 'Задача добавлена', task: newArchive });
})

app.listen(3000, () => {
    console.log('3000');
});