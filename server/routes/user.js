const express = require('express');
const router = express.Router();
const fetchToken = require('../middlewares/fetchToken');
const userController = require('../controllers/user_controller');

router.post('/changename', fetchToken, userController.changeName);

module.exports = router;