const get = require('../controllers/archiveController');
const express = require('express');
const router = express.Router();

/******** СТРАНИЦЫ *********/
router.get('/api/archive/:companyId', get.archive);

router.put('/api/orders/:id/unarchive', get.unarchive);

module.exports = router;