const get = require('../controllers/adminController');
const express = require('express');
const router = express.Router();

router.post('/chat', get.chat);

router.put('/api/admin/users/:id/active', get.put);

router.get('/api/admin/dashboard', get.get);

router.put('/api/admin/settings', get.settings);

module.exports = router;