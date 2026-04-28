const express = require('express');
const { body } = require('express-validator');
const { activateInvite, forcePasswordChange, forgotPassword, login, logout, me, refresh, resetPassword } = require('../controllers/authController');
const authenticateToken = require('../middleware/auth');
const { strictAuthLimiter, tokenActionLimiter } = require('../middleware/rateLimiters');
const validate = require('../middleware/validate');

const router = express.Router();

router.post('/login', strictAuthLimiter, body('email').optional().isString().notEmpty(), body('username').optional().isString().notEmpty(), body('identifier').optional().isString().notEmpty(), body('password').isString().notEmpty(), validate, login);
router.post('/logout', logout);
router.post('/refresh', strictAuthLimiter, refresh);
router.post('/forgot-password', strictAuthLimiter, body('email').isEmail(), validate, forgotPassword);
router.post('/reset-password', tokenActionLimiter, body('token').isString().notEmpty(), body('newPassword').isLength({ min: 8 }), validate, resetPassword);
router.post('/force-password-change', authenticateToken, body('newPassword').isLength({ min: 8 }), validate, forcePasswordChange);
router.post('/activate', tokenActionLimiter, body('token').isString().notEmpty(), body('password').isLength({ min: 8 }), validate, activateInvite);
router.get('/me', authenticateToken, me);

module.exports = router;
