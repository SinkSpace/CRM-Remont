const get = require('../controllers/adminController');
const express = require('express');
const router = express.Router();

router.post('/chat', get.chat);

app.put('/api/admin/users/:id/active', get.put);

app.get('/api/admin/dashboard', get.get);

app.put('/api/admin/settings', get.settings);

module.exports = router;