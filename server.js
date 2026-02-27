const express = require('express'); /* подключение express */
const cors = require('cors'); /* подключение cors */
const path = require('path');
const fs = require('fs');
const { stringify } = require('querystring');
const app = express(); /* создание веб-приложения */

app.use(express.static(path.join(__dirname, 'public')));
app.use(cors());
app.use(express.json());

const dataPath = path.join(__dirname, 'orders.json');

app.get('/orders', (req, res) => {
    const orders = readOrders();
    res.json(orders);
})

app.post('/orders', (req, res) => {
    const ordersFile = path.join(__dirname, 'orders.json');
    const newTask = req.body;
    let tasks = [];
    if (fs.existsSync(ordersFile)) {
        tasks = JSON.parse(fs.readFileSync(ordersFile, 'utf8'));
    }
    tasks.push(newTask);
    fs.writeFileSync(ordersFile, JSON.stringify(tasks, null, 2));
    res.status(201).json({ message: 'Задача добавлена', task: newTask });
});

app.delete('/orders/:id', (req, res) => {
    const orders = readOrders();
    const id = Number(req.params.id);
    
    const newOrders = orders.filter(task => task.id !== id);
    
    if (newOrders.length < orders.length) {
        writeOrders(newOrders);
        res.sendStatus(200);
    } else {
        res.status(404).json({ message: 'Задача не найдена' });
    }
});

app.put('/orders/:id', (req, res) => {
    const orders = readOrders();
    const id = Number(req.params.id);
    const updatedTask = req.body;
    
    const index = orders.findIndex(task => task.id === id);
    if (index !== -1) {
        orders[index] = updatedTask;
        writeOrders(orders);
        res.json({ message: 'Задача обновлена', task: updatedTask });
    } else {
        res.status(404).json({ message: 'Задача не найдена' });
    }
});

app.listen(3000, () => {
    console.log('3000');
});

function readOrders() {
    const data = fs.readFileSync(dataPath, 'utf8');
    return JSON.parse(data);
}

function writeOrders(orders) {
    fs.writeFileSync(dataPath, JSON.stringify(orders, null, 2));
}