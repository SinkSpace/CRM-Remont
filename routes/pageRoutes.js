const get = require('./../contollers/pageContoller');
const express = require('express');
const router = express.Router();

/******** СТРАНИЦЫ *********/
router.get('/', get.getIndex);

router.get('/register', get.getRegister);

router.get('/join', get.getJoin);

router.get('/logs', get.getLogs);

router.get('/settings', get.getSettings);

router.get('/admin', get.getAdmin);

router.get('/archive', get.getArchive);

router.get('/start', get.getStart);

router.get('/statistic', get.getStatistic);

module.exports = router;