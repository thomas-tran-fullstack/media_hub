const express = require('express');
const router = express.Router();

const authController = require('../controllers/authController');

// GET routes
router.get('/login', authController.getLoginPage);
router.get('/register', authController.getRegisterPage);

// Session helpers
router.post('/logout', authController.logout);
router.get('/me', authController.me);

// POST routes
router.post('/login', authController.handleLogin);
router.post('/register', authController.handleRegister);

module.exports = router;
