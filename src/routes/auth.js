const express = require('express');
const { body } = require('express-validator');
const { activateInvite, forgotPassword, login, logout, me, refresh, resetPassword } = require('../controllers/authController');
const authenticateToken = require('../middleware/auth');
const validate = require('../middleware/validate');

const router = express.Router();

router.post('/login', body('email').isEmail(), body('password').isString().notEmpty(), validate, login);
router.post('/logout', logout);
router.post('/refresh', refresh);
router.post('/forgot-password', body('email').isEmail(), validate, forgotPassword);
router.post('/reset-password', body('token').isString().notEmpty(), body('newPassword').isLength({ min: 8 }), validate, resetPassword);
router.post('/activate', body('token').isString().notEmpty(), body('password').isLength({ min: 8 }), validate, activateInvite);
router.get('/me', authenticateToken, me);

module.exports = router;
