const express = require('express');
const router = express.Router();
const fetchToken = require('../middlewares/fetchToken');
const guestController = require('../controllers/guest_controller');

router.post('/changename', fetchToken, guestController.changeName);

module.exports = router;