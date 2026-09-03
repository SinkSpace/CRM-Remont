const get = require('../controllers/workerController');
const express = require('express');
const router = express.Router();

/* 4. Получение сотрудников */
router.get('/api/workers/:companyId', get.getCompanyID);

/* 4.1 Добавление */
router.post('/api/workers', get.postWorkers);

/* 4.2 Редактирование */
router.put('/api/workers/:id', get.putWorkers);

/* 4.3 Удаление */
router.delete('/api/workers/:id', get.deleteWorkers);

module.exports = router;