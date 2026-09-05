const get = require('../controllers/statConroller');

/* 10.1 Общая статистика */
app.get('/stats', get.total);

/* 10.2 Статистика по сотрудникам за день */
app.get('/stats/workers/day', get.day);

/* 10.3 Статистика по сотрудникам за месяц */
app.get('/stats/workers/month', get.month);

module.exports = { total, day, month };