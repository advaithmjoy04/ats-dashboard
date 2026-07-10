const express = require('express');
const { body } = require('express-validator');
const {
  applyJob,
  deleteOwnApplication,
  getProfile,
  getResumeUrl,
  getJobApplicationForm,
  listJobs,
  myApplications,
  updateProfile,
  uploadResume,
  withdrawApplication,
} = require('../controllers/studentController');
const authenticateToken = require('../middleware/auth');
const { uploadActionLimiter } = require('../middleware/rateLimiters');
const requireRole = require('../middleware/requireRole');
const { upload } = require('../middleware/upload');
const validate = require('../middleware/validate');

const router = express.Router();

router.get('/profile', authenticateToken, requireRole('STUDENT'), getProfile);
router.put(
  '/profile',
  authenticateToken,
  requireRole('STUDENT'),
  body('fullName').optional().isString(),
  body('branch').optional().isString(),
  body('semester').optional().isInt({ min: 1 }),
  body('cgpa').optional().isFloat({ min: 0, max: 10 }),
  body('phone').optional().isString(),
  body('educationDetails').optional().isString(),
  body('skills').optional().isArray(),
  validate,
  updateProfile
);
router.post('/resume', authenticateToken, requireRole('STUDENT'), uploadActionLimiter, upload.single('resume'), uploadResume);
router.get('/resume-url', authenticateToken, requireRole('STUDENT'), getResumeUrl);
router.get('/jobs', authenticateToken, requireRole('STUDENT'), listJobs);
router.get('/jobs/:jobId/form', authenticateToken, requireRole('STUDENT'), getJobApplicationForm);
router.post('/applications', authenticateToken, requireRole('STUDENT'), uploadActionLimiter, upload.any(), body('jobId').isString().notEmpty(), validate, applyJob);
router.get('/applications/my', authenticateToken, requireRole('STUDENT'), myApplications);
router.patch('/applications/:id/withdraw', authenticateToken, requireRole('STUDENT'), validate, withdrawApplication);
router.delete('/applications/:id', authenticateToken, requireRole('STUDENT'), deleteOwnApplication);

module.exports = router;
