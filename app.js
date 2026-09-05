/******** Подключение *********/
const express = require('express'); /* подключение express */
const path = require('path');
const app = express(); /* создание веб-приложения */
const fs = require('fs');
const templatesDir = path.join(__dirname, 'uploads', 'templates');
const generatedDir = path.join(__dirname, 'uploads', 'generated');
/******** Middleware *********/
const { configureMiddleware } = require('./middleware/middleware');
configureMiddleware(app);

/******** Создание папок *********/
fs.mkdirSync(templatesDir, { recursive: true });
fs.mkdirSync(generatedDir, { recursive: true });

/******** Отправка страниц *********/

const pageRoutes = require('./routes/pageRoutes');

app.use('/', pageRoutes);

/******** Заказы *********/

const orderRoutes = require('./routes/orderRoutes');

app.use('/', orderRoutes);

/******** Архивация *********/

const archiveRoutes = require('./routes/archiveRoutes');

app.use('/', archiveRoutes);

/******** Авторизация *********/

const registerRoutes = require('./routes/registerRoutes');

app.use('/', registerRoutes);

/******** Профиль *********/

const profileRoutes = require('./routes/profileRoutes');

app.use('/', profileRoutes);

/******** Сотрудники *********/

const workerRoutes = require('./routes/workerRoutes');

app.use('/', workerRoutes);

/******** Устройства *********/

const devicesRoutes = require('./routes/devicesRoutes');

app.use('/', devicesRoutes);

/******** Статусы *********/

const statusRoutes = require('./routes/statusRoutes');

app.use('/', statusRoutes);

/******** Контакты *********/

const contactRoutes = require('./routes/contactRoutes');

app.use('/', contactRoutes);

/******** Логи *********/

const logRoutes = require('./routes/logRoutes');

app.use('/', logRoutes);

/******** Шаблоны документов *********/

const documentRoutes = require('./routes/documentRoutes');

app.use('/', documentRoutes);

/******** Статистика *********/

const statRoutes = require('./routes/statRoutes');

app.use('/', statRoutes);

/******** Взаимодействие с ИИ *********/

const AIRoutes = require('./routes/AIRoutes');

app.use('/', AIRoutes);

/******** Админ-панель *********/

const adminRoutes = require('./routes/adminRoutes');

app.use('/', adminRoutes);

/******** Запуск сервера *********/

module.exports = app;