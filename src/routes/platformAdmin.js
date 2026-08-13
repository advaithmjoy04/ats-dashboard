const express = require('express');
const { body } = require('express-validator');
const {
  listTenants,
  getTenant,
  createTenant,
  updateTenant,
  listTenantAdmins,
  createTenantAdmin,
  deleteTenantAdmin,
  deactivateTenant,
  activateTenant,
  deleteTenant,
} = require('../controllers/platformAdminController');
const authenticateToken = require('../middleware/auth');
const requirePlatformRole = require('../middleware/requirePlatformRole');
const validate = require('../middleware/validate');
const { isStrongPassword, PASSWORD_VALIDATION_MESSAGE } = require('../utils/passwordValidation');

const router = express.Router();

function validateOptionalStrongPassword(value) {
  if (!value) {
    return true;
  }

  if (!isStrongPassword(value)) {
    throw new Error(PASSWORD_VALIDATION_MESSAGE);
  }

  return true;
}

router.use(authenticateToken, requirePlatformRole);

router.get('/tenants', listTenants);
router.get('/tenants/:id', getTenant);
router.get('/tenants/:id/admins', listTenantAdmins);
router.post(
  '/tenants',
  body('name').isString().trim().isLength({ min: 2, max: 120 }),
  body('slug').optional({ values: 'falsy' }).isString().trim().isLength({ min: 2, max: 120 }),
  body('subdomain').optional({ values: 'falsy' }).isString().trim().isLength({ min: 2, max: 120 }),
  body('customDomain').optional({ values: 'falsy' }).isString().trim().isLength({ min: 3, max: 255 }),
  body('allowedOrigins').optional().isArray(),
  body('allowedOrigins.*').optional().isURL(),
  body('supportEmail').optional({ values: 'falsy' }).isEmail(),
  body('emailFromName').optional().isString().trim().isLength({ max: 120 }),
  body('loginHeadline').optional().isString().trim().isLength({ max: 160 }),
  body('loginSubtext').optional().isString().trim().isLength({ max: 320 }),
  body('adminEmail').isEmail(),
  body('adminUsername').optional({ values: 'falsy' }).isString().trim().isLength({ min: 3, max: 60 }),
  body('adminPassword').optional({ values: 'falsy' }).isString().isLength({ max: 128 }).custom(validateOptionalStrongPassword),
  body('adminFullName').isString().trim().isLength({ min: 2, max: 120 }),
  body('isActive').optional().isBoolean(),
  validate,
  createTenant
);
router.post(
  '/tenants/:id/admins',
  body('fullName').isString().trim().isLength({ min: 2, max: 120 }),
  body('email').isEmail(),
  body('username').optional({ values: 'falsy' }).isString().trim().isLength({ min: 3, max: 60 }),
  body('password').optional({ values: 'falsy' }).isString().isLength({ max: 128 }).custom(validateOptionalStrongPassword),
  validate,
  createTenantAdmin
);
router.patch(
  '/tenants/:id',
  body('name').optional().isString().trim().isLength({ min: 2, max: 120 }),
  body('slug').optional().isString().trim().isLength({ min: 2, max: 120 }),
  body('subdomain').optional({ values: 'falsy' }).isString().trim().isLength({ min: 2, max: 120 }),
  body('customDomain').optional({ values: 'falsy' }).isString().trim().isLength({ min: 3, max: 255 }),
  body('allowedOrigins').optional().isArray(),
  body('allowedOrigins.*').optional().isURL(),
  body('supportEmail').optional({ values: 'falsy' }).isEmail(),
  body('emailFromName').optional().isString().trim().isLength({ max: 120 }),
  body('loginHeadline').optional().isString().trim().isLength({ max: 160 }),
  body('loginSubtext').optional().isString().trim().isLength({ max: 320 }),
  body('isActive').optional().isBoolean(),
  validate,
  updateTenant
);
router.patch('/tenants/:id/deactivate', body('passwordConfirmation').isString().notEmpty(), validate, deactivateTenant);
router.patch('/tenants/:id/activate', activateTenant);
router.delete('/tenants/:id/admins/:userId', body('passwordConfirmation').isString().notEmpty(), validate, deleteTenantAdmin);
router.delete('/tenants/:id', body('passwordConfirmation').isString().notEmpty(), validate, deleteTenant);

module.exports = router;
