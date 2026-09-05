const get = require('../controllers/documentController');
const express = require('express');
const router = express.Router();

/* 9.1 Получение */

app.post('/api/templates/upload', get.post);

app.get('/api/templates/:companyId', get.get);

/* 9.2 Удаление */

app.delete('/api/templates/:id', get.del);

/* 9.3 Штрихкод */

app.get('/api/barcode/:text', get.barcode);

/* 9.4 Генерация документа */

app.post('/api/document/generate', get.generate);

module.exports = router;