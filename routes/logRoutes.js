const get = require('../controllers/logController');
const express = require('express');
const router = express.Router();

app.get('/api/logs/:companyId', get);

module.exports = router;