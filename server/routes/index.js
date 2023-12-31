const express = require('express');
const router = express.Router();
const homeController = require('../controllers/home_controller');

router.get('/', homeController.home);

router.use('/auth', require('./auth'));
router.use('/user', require('./user'));
router.use('/guest', require('./guest'));


module.exports = router;