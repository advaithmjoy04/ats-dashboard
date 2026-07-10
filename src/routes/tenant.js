const express = require('express');
const { body } = require('express-validator');
const {
  getPublicTenantConfig,
  getTenantSettings,
  updateTenantSettings,
  uploadTenantLogo,
  uploadTenantFavicon,
  getTenantAsset,
} = require('../controllers/tenantController');
const authenticateToken = require('../middleware/auth');
const requireRole = require('../middleware/requireRole');
const { imageUpload } = require('../middleware/upload');
const validate = require('../middleware/validate');

const router = express.Router();

router.get('/public', getPublicTenantConfig);
router.get('/assets/:assetType', getTenantAsset);
router.get('/settings', authenticateToken, requireRole('ADMIN'), getTenantSettings);
router.patch(
  '/settings',
  authenticateToken,
  requireRole('ADMIN'),
  body('name').optional().isString().trim().isLength({ min: 2, max: 120 }),
  body('logoUrl')
    .optional({ values: 'falsy' })
    .custom((value) => {
      if (typeof value === 'string' && (value.startsWith('/') || require('validator').isURL(value))) {
        return true;
      }
      throw new Error('Logo URL must be a valid URL or relative path');
    }),
  body('faviconUrl')
    .optional({ values: 'falsy' })
    .custom((value) => {
      if (typeof value === 'string' && (value.startsWith('/') || require('validator').isURL(value))) {
        return true;
      }
      throw new Error('Favicon URL must be a valid URL or relative path');
    }),
  body('primaryColor').optional().matches(/^#([0-9a-fA-F]{6}|[0-9a-fA-F]{3})$/),
  body('secondaryColor').optional().matches(/^#([0-9a-fA-F]{6}|[0-9a-fA-F]{3})$/),
  body('supportEmail').optional({ values: 'falsy' }).isEmail(),
  body('emailFromName').optional().isString().trim().isLength({ max: 120 }),
  body('loginHeadline').optional().isString().trim().isLength({ max: 160 }),
  body('loginSubtext').optional().isString().trim().isLength({ max: 320 }),
  validate,
  updateTenantSettings
);
router.post('/logo', authenticateToken, requireRole('ADMIN'), imageUpload.single('logo'), uploadTenantLogo);
router.post('/favicon', authenticateToken, requireRole('ADMIN'), imageUpload.single('favicon'), uploadTenantFavicon);

module.exports = router;
