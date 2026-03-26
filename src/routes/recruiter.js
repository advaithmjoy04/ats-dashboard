const express = require('express');
const { body } = require('express-validator');
const { createJob, getApplicants, listJobs, updateApplication, updateJob } = require('../controllers/recruiterController');
const authenticateToken = require('../middleware/auth');
const requireRole = require('../middleware/requireRole');
const validate = require('../middleware/validate');

const router = express.Router();

router.get('/jobs', authenticateToken, requireRole('RECRUITER'), listJobs);
router.post('/jobs', authenticateToken, requireRole('RECRUITER'), body('title').isString().notEmpty(), body('companyName').isString().notEmpty(), body('description').isString().notEmpty(), validate, createJob);
router.patch(
  '/jobs/:jobId',
  authenticateToken,
  requireRole('RECRUITER'),
  body('title').optional().isString(),
  body('description').optional().isString(),
  body('status').optional().isString(),
  validate,
  updateJob
);
router.get('/jobs/:jobId/applicants', authenticateToken, requireRole('RECRUITER'), getApplicants);
router.patch('/applications/:id', authenticateToken, requireRole('RECRUITER'), body('status').isString().notEmpty(), validate, updateApplication);

module.exports = router;
