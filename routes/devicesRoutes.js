const get = require('../controllers/devicesController');
const express = require('express');
const router = express.Router();

/* 5.1 Получение */
router.get('/api/devices/:companyId', get.get);

/* 5.1 Добавление */
router.post('/api/devices', get.post);

/* 5.1 Удаление */
router.delete('/api/devices/:id', get.del);

module.exports = router;