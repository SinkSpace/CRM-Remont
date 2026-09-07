const get = require('../controllers/documentController');
const express = require('express');
const router = express.Router();
const upload = require('../middleware/middleware');

/* 9.1 Получение */

router.post('/api/templates/upload', upload.single('template'), get.post);

router.get('/api/templates/:companyId', get.get);

/* 9.2 Удаление */

router.delete('/api/templates/:id', get.del);

/* 9.3 Штрихкод */

router.get('/api/barcode/:text', get.barcode);

/* 9.4 Генерация документа */

router.post('/api/document/generate', get.generate);

module.exports = router;