const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');

// Public routes
router.post('/register', authController.register);
router.post('/login', authController.login);
router.post('/logout', authController.logout);
router.post('/reset-password', authController.resetPasswordRequest);

// Protected routes
router.get('/me', authController.verifyToken, authController.getCurrentUser);
router.get('/users', authController.verifyToken, authController.getAllUsers);

module.exports = router;