const express = require('express');
const { body, param } = require('express-validator');
const {
  listEmailGroups,
  createEmailGroup,
  updateEmailGroup,
  deleteEmailGroup,
  sendGroupActivations,
} = require('../controllers/emailGroupController');
const authenticateToken = require('../middleware/auth');
const requireRole = require('../middleware/requireRole');
const validate = require('../middleware/validate');

const router = express.Router();

const memberValidator = body('members')
  .optional({ nullable: true })
  .isArray({ max: 500 })
  .withMessage('Members must be an array with at most 500 entries');

router.get('/', authenticateToken, requireRole('ADMIN'), listEmailGroups);

router.post(
  '/',
  authenticateToken,
  requireRole('ADMIN'),
  body('name').isString().trim().notEmpty().withMessage('Group name is required'),
  body('role').isIn(['STUDENT', 'RECRUITER']).withMessage('Group role must be STUDENT or RECRUITER'),
  body('description').optional().isString(),
  memberValidator,
  body('members.*.email').optional().isEmail().withMessage('Each member email must be valid'),
  body('members.*.fullName').optional().isString(),
  validate,
  createEmailGroup
);

router.patch(
  '/:id',
  authenticateToken,
  requireRole('ADMIN'),
  param('id').isMongoId().withMessage('Invalid email group id'),
  body('name').isString().trim().notEmpty().withMessage('Group name is required'),
  body('role').isIn(['STUDENT', 'RECRUITER']).withMessage('Group role must be STUDENT or RECRUITER'),
  body('description').optional().isString(),
  memberValidator,
  body('members.*.email').optional().isEmail().withMessage('Each member email must be valid'),
  body('members.*.fullName').optional().isString(),
  validate,
  updateEmailGroup
);

router.delete(
  '/:id',
  authenticateToken,
  requireRole('ADMIN'),
  param('id').isMongoId().withMessage('Invalid email group id'),
  validate,
  deleteEmailGroup
);

router.post(
  '/:id/send-activations',
  authenticateToken,
  requireRole('ADMIN'),
  param('id').isMongoId().withMessage('Invalid email group id'),
  validate,
  sendGroupActivations
);

module.exports = router;
