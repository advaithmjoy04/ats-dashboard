const express = require('express');
const { listJobs } = require('../controllers/studentController');
const authenticateToken = require('../middleware/auth');
const requireRole = require('../middleware/requireRole');

const router = express.Router();

router.get('/', authenticateToken, requireRole('STUDENT'), listJobs);

module.exports = router;
