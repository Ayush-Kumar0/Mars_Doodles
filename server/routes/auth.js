const express = require('express');
const router = express.Router();
const userController = require('../controllers/user_controller');
const guestController = require('../controllers/guest_controller');
const userGuestController = require('../controllers/user_guest_controller');
const fetchToken = require('../middlewares/fetchToken');

// User authentication
router.post('/signup', userController.create);
router.post('/signin', userController.createSession);
router.post('/googlesignin', userController.googleSignin);
// router.post('/sendcode', userController.sendCode);

// Guest authentication
router.get('/guest', guestController.create);

//Logout
router.get('/logout', userGuestController.logout);
// existence of any account (guest or user)
router.get('/exists', fetchToken, userGuestController.exists);

module.exports = router;