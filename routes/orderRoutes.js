const get = require('../controllers/orderController');
const express = require('express');
const router = express.Router();

router.post('/orders', get.postOrders);

router.get('/orders', get.getOrders);

router.get('/orders/company/:companyId', get.getCompanyID);

router.put('/orders/:id', get.updateOrder);

router.get('/api/orders/:id/archive', get.getArchiveID);

module.exports = router;