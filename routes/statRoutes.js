const get = require('../controllers/statConroller');
const express = require('express');
const router = express.Router();

/* 10.1 Общая статистика */
router.get('/stats', get.total);

/* 10.2 Статистика по сотрудникам за день */
router.get('/stats/workers/day', get.day);

/* 10.3 Статистика по сотрудникам за месяц */
router.get('/stats/workers/month', get.month);

module.exports = { total, day, month };