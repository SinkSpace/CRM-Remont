const get = require('../controllers/profileController');
const express = require('express');
const router = express.Router();

/* 3. Получение профиля */
router.get('/api/profile/:id', get.getProfile);

/* 3.1 Обновление профиля */
router.put('/api/profile/:id', get.putProfile);


module.exports = router;