const express = require('express');
const reg = require('../controllers/registerController');
const router = express.Router();

router.post('/api/register', reg.postRegister);

router.post('/api/login', reg.postLogin);

module.exports = router;