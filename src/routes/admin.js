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
  sendEmailTest,
} = require('../controllers/adminController');
const authenticateToken = require('../middleware/auth');
const requireRole = require('../middleware/requireRole');
const validate = require('../middleware/validate');

const router = express.Router();

router.post(
  '/students',
  authenticateToken,
  requireRole('ADMIN'),
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
router.post('/recruiters', authenticateToken, requireRole('ADMIN'), body('email').isEmail(), body('fullName').isString().notEmpty(), validate, inviteRecruiter);
router.patch('/users/:id/deactivate', authenticateToken, requireRole('ADMIN'), deactivateUser);
router.delete('/users/:id', authenticateToken, requireRole('ADMIN'), deleteUserInvite);
router.post('/jobs', authenticateToken, requireRole('ADMIN'), body('title').optional().isString(), body('role').optional().isString(), body('companyName').isString().notEmpty(), body('description').isString().notEmpty(), validate, createJob);
router.get('/jobs', authenticateToken, requireRole('ADMIN'), listJobs);
router.delete('/jobs/:jobId', authenticateToken, requireRole('ADMIN'), deleteJob);
router.get('/dashboard', authenticateToken, requireRole('ADMIN'), getDashboard);
router.get('/recruiters', authenticateToken, requireRole('ADMIN'), listRecruiters);
router.get('/students', authenticateToken, requireRole('ADMIN'), listStudents);
router.get('/candidates', authenticateToken, requireRole('ADMIN'), listCandidates);
router.post('/test-email', authenticateToken, requireRole('ADMIN'), body('email').isEmail(), validate, sendEmailTest);

module.exports = router;
