const get = require('../controllers/AIController');
const express = require('express');
const router = express.Router();

router.post('/chat', get.query);

router.get('/api/ai/settings', get.settings);

module.exports = router;