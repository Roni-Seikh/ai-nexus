const express = require('express');
const router  = express.Router();
const auth    = require('../controllers/authController');
const { protect } = require('../middleware/auth');
const { body }    = require('express-validator');
const validate    = require('../middleware/validate');

// OTP Registration flow
router.post('/register/send-otp', [
  body('name').trim().notEmpty().withMessage('Name required'),
  body('email').isEmail().normalizeEmail().withMessage('Valid email required'),
  body('password').isLength({ min: 8 }).withMessage('Password min 8 chars'),
], validate, auth.sendRegisterOTP);

router.post('/register/verify-otp', [
  body('email').isEmail().normalizeEmail(),
  body('otp').isLength({ min: 6, max: 6 }).withMessage('OTP must be 6 digits'),
], validate, auth.verifyRegisterOTP);

router.post('/resend-otp', auth.resendOTP);

// Login
router.post('/login', [
  body('email').isEmail().normalizeEmail(),
  body('password').notEmpty(),
], validate, auth.login);

// Demo
router.post('/demo', auth.demoLogin);

// Forgot password OTP flow
router.post('/forgot-password', body('email').isEmail().normalizeEmail(), validate, auth.forgotPassword);
router.post('/forgot-password/verify-otp', [
  body('email').isEmail().normalizeEmail(),
  body('otp').isLength({ min: 6, max: 6 }),
], validate, auth.verifyForgotOTP);
router.post('/reset-password', auth.resetPassword);

// Token
router.post('/refresh-token', auth.refreshToken);
router.post('/logout', protect, auth.logout);
router.get('/verify-email/:token', auth.verifyEmail);
router.get('/me', protect, auth.getMe);

module.exports = router;
