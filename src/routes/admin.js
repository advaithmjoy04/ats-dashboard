const express = require('express');
const { body } = require('express-validator');
const {
  inviteStudent,
  inviteRecruiter,
  deactivateUser,
  deleteUserInvite,
  createJob,
  listJobs,
  deleteJob,
  getDashboard,
  listRecruiters,
  listStudents,
  listCandidates,
  updateCandidateFeedback,
  sendEmailTest,
} = require('../controllers/adminController');
const authenticateToken = require('../middleware/auth');
const { inviteActionLimiter } = require('../middleware/rateLimiters');
const requireRole = require('../middleware/requireRole');
const validate = require('../middleware/validate');
const emailGroupsRouter = require('./emailGroups');

const router = express.Router();

router.use('/email-groups', emailGroupsRouter);

router.post(
  '/students',
  authenticateToken,
  requireRole('ADMIN'),
  inviteActionLimiter,
  body('email').isEmail(),
  body('fullName').isString().notEmpty(),
  body('usn').optional().isString(),
  body('branch').optional().isString(),
  body('semester').optional().isInt({ min: 1 }),
  body('cgpa').optional().isFloat({ min: 0, max: 10 }),
  body('phone').optional().isString(),
  validate,
  inviteStudent
);
router.post('/recruiters', authenticateToken, requireRole('ADMIN'), inviteActionLimiter, body('email').isEmail(), body('fullName').isString().notEmpty(), validate, inviteRecruiter);
router.patch('/users/:id/deactivate', authenticateToken, requireRole('ADMIN'), body('passwordConfirmation').isString().notEmpty(), validate, deactivateUser);
router.delete('/users/:id', authenticateToken, requireRole('ADMIN'), body('passwordConfirmation').isString().notEmpty(), validate, deleteUserInvite);
router.post(
  '/jobs',
  authenticateToken,
  requireRole('ADMIN'),
  body('title').optional().isString(),
  body('role').optional().isString(),
  body('companyName').optional().isString(),
  body('description').optional().isString(),
  body('publishState').optional().isString(),
  validate,
  createJob
);
router.get('/jobs', authenticateToken, requireRole('ADMIN', 'PLATFORM_SUPER_ADMIN'), listJobs);
router.delete('/jobs/:jobId', authenticateToken, requireRole('ADMIN'), body('passwordConfirmation').isString().notEmpty(), validate, deleteJob);
router.get('/dashboard', authenticateToken, requireRole('ADMIN', 'PLATFORM_SUPER_ADMIN'), getDashboard);
router.get('/recruiters', authenticateToken, requireRole('ADMIN', 'PLATFORM_SUPER_ADMIN'), listRecruiters);
router.get('/students', authenticateToken, requireRole('ADMIN', 'PLATFORM_SUPER_ADMIN'), listStudents);
router.get('/candidates', authenticateToken, requireRole('ADMIN', 'PLATFORM_SUPER_ADMIN'), listCandidates);
router.patch(
  '/applications/:id/feedback',
  authenticateToken,
  requireRole('ADMIN', 'PLATFORM_SUPER_ADMIN'),
  body('summary').optional().isString(),
  body('notes').optional().isString(),
  body('rating').optional({ values: 'falsy' }).isInt({ min: 1, max: 5 }),
  validate,
  updateCandidateFeedback
);
router.post('/test-email', authenticateToken, requireRole('ADMIN'), body('email').isEmail(), validate, sendEmailTest);

module.exports = router;
