const express = require('express');
const authenticateToken = require('../middleware/auth');
const { search } = require('../controllers/searchController');
const { searchLimiter } = require('../middleware/rateLimiters');

const router = express.Router();

router.get('/', authenticateToken, searchLimiter, search);

module.exports = router;
