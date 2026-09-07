const get = require('../controllers/documentController');
const multer = require('multer');
const path = require('path');
const express = require('express');
const router = express.Router();

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, path.join(__dirname, '..', 'uploads', 'templates'));
    },

    filename: (req, file, cb) => {
        const ext = path.extname(file.originalname);
        const filename = `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`;

        cb(null, filename);
    }
});

const upload = multer({ storage });

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