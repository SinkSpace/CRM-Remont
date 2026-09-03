const get = require('../controllers/statusController');
const express = require('express');
const router = express.Router();

/* 6.1 Получение */
app.get('/api/statuses/:companyId', get.get);

/* 6.2 Добавление */
app.post('/api/statuses', get.post);

/* 6.3 Удаление */
app.delete('/api/statuses/:id', get.del);

module.exports = router;