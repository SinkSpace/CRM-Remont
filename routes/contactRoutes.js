const get = require('../controllers/contactController');
const express = require('express');
const router = express.Router();

router.get('/api/contacts/:companyId', get);

module.exports = router;