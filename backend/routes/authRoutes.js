const express = require('express');
const { authenticateJWT } = require('../middleware/auth');
const {
  registerValidation,
  loginValidation,
  forgotPasswordValidation,
  resetPasswordValidation
} = require('../middleware/validate');
const authController = require('../controllers/authController');

const router = express.Router();

// Admin authentication
router.post('/admin/login', authController.adminLogin);

// Tenant authentication
router.post('/register', registerValidation, authController.register);
router.post('/login', authController.login);
router.post('/logout', authController.logout);
router.get('/restore-session', authController.restoreSession);

// Email verification
router.get('/verify-email', authController.verifyEmail);

// Password management
router.post('/forgot-password', forgotPasswordValidation, authController.forgotPassword);
router.post('/reset-password', resetPasswordValidation, authController.resetPassword);

// Protected: Get current user profile
router.get('/me', authenticateJWT, authController.getCurrentUser);

module.exports = router;
