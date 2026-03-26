const express = require('express');
const { body } = require('express-validator');
const { applyJob, myApplications } = require('../controllers/studentController');
const authenticateToken = require('../middleware/auth');
const requireRole = require('../middleware/requireRole');
const validate = require('../middleware/validate');

const router = express.Router();

router.post('/', authenticateToken, requireRole('STUDENT'), body('jobId').isString().notEmpty(), validate, applyJob);
router.get('/my', authenticateToken, requireRole('STUDENT'), myApplications);

module.exports = router;
