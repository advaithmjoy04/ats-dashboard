const { Tenant } = require('../models');
const { createAuditLog } = require('../services');
const AppError = require('../utils/AppError');
const catchAsync = require('../utils/catchAsync');
const { buildTenantAssetKey, deleteObject, getReadUrl, uploadBuffer } = require('../utils/s3');
const { sendData } = require('../utils/response');
const { isSharedHost, normalizeHost } = require('../services/tenantService');

async function resolveTenantForPublicRequest(req) {
  const host = normalizeHost(req.headers['x-forwarded-host'] || req.headers.host);
  const tenantHint = String(req.query.tenant || '').trim().toLowerCase();

  if (tenantHint && isSharedHost(host, { frontendOrigin: process.env.FRONTEND_ORIGIN || '' })) {
    const hintedTenant = await Tenant.findOne({ isActive: true, slug: tenantHint }).lean();
    if (hintedTenant) {
      return hintedTenant;
    }
  }

  return Tenant.findById(req.tenant.id).lean();
}

function getAssetUrl(assetType, tenant) {
  if (assetType === 'logo') {
    if (tenant.logoKey) {
      return `/api/v1/tenant/assets/logo?v=${new Date(tenant.updatedAt || Date.now()).getTime()}`;
    }
    return tenant.logoUrl || '';
  }

  if (tenant.faviconKey) {
    return `/api/v1/tenant/assets/favicon?v=${new Date(tenant.updatedAt || Date.now()).getTime()}`;
  }

  return tenant.faviconUrl || '';
}

const getPublicTenantConfig = catchAsync(async (req, res) => {
  const tenant = await resolveTenantForPublicRequest(req);

  return sendData(res, 200, {
    id: tenant._id,
    name: tenant.name,
    slug: tenant.slug,
    logoUrl: getAssetUrl('logo', tenant),
    faviconUrl: getAssetUrl('favicon', tenant),
    primaryColor: tenant.primaryColor || '#3d79f2',
    secondaryColor: tenant.secondaryColor || '#18212f',
    loginHeadline: tenant.loginHeadline || 'Sign In',
    loginSubtext: tenant.loginSubtext || 'Access your ATS account to manage jobs, applications, and placement activity.',
    supportEmail: tenant.supportEmail || '',
  });
});

const getTenantSettings = catchAsync(async (req, res) => {
  const tenant = await Tenant.findById(req.user.tenantId).lean();
  return sendData(res, 200, {
    ...tenant,
    logoUrl: getAssetUrl('logo', tenant),
    faviconUrl: getAssetUrl('favicon', tenant),
  });
});

const updateTenantSettings = catchAsync(async (req, res) => {
  const allowedFields = [
    'name',
    'logoUrl',
    'faviconUrl',
    'primaryColor',
    'secondaryColor',
    'supportEmail',
    'emailFromName',
    'loginHeadline',
    'loginSubtext',
  ];

  const updates = Object.fromEntries(
    Object.entries(req.body).filter(([key, value]) => allowedFields.includes(key) && value !== undefined)
  );

  const tenant = await Tenant.findByIdAndUpdate(req.user.tenantId, updates, {
    new: true,
    runValidators: true,
  }).lean();

  await createAuditLog({
    req,
    action: 'tenant.branding.update',
    targetType: 'Tenant',
    targetId: tenant._id,
    metadata: {
      updatedFields: Object.keys(updates),
      name: tenant.name,
    },
  });

  return sendData(res, 200, {
    ...tenant,
    logoUrl: getAssetUrl('logo', tenant),
    faviconUrl: getAssetUrl('favicon', tenant),
  });
});

async function replaceTenantAsset({ tenant, file, assetType }) {
  const keyField = assetType === 'favicon' ? 'faviconKey' : 'logoKey';
  const urlField = assetType === 'favicon' ? 'faviconUrl' : 'logoUrl';
  const previousKey = tenant[keyField];
  const nextKey = buildTenantAssetKey(tenant._id, assetType, file.originalname);

  await uploadBuffer({
    key: nextKey,
    body: file.buffer,
    contentType: file.mimetype,
  });

  tenant[keyField] = nextKey;
  tenant[urlField] = '';
  await tenant.save();

  if (previousKey && previousKey !== nextKey) {
    await deleteObject(previousKey).catch(() => {});
  }

  return {
    key: nextKey,
    url: getAssetUrl(assetType, tenant.toObject()),
  };
}

const uploadTenantLogo = catchAsync(async (req, res, next) => {
  if (!req.file) {
    return next(new AppError('Logo image required', 400));
  }

  const tenant = await Tenant.findById(req.user.tenantId);
  if (!tenant) {
    return next(new AppError('Tenant not found', 404));
  }

  const asset = await replaceTenantAsset({ tenant, file: req.file, assetType: 'logo' });
  await createAuditLog({
    req,
    action: 'tenant.branding.logo.upload',
    targetType: 'Tenant',
    targetId: tenant._id,
    metadata: { key: asset.key },
  });
  return sendData(res, 200, asset);
});

const uploadTenantFavicon = catchAsync(async (req, res, next) => {
  if (!req.file) {
    return next(new AppError('Favicon image required', 400));
  }

  const tenant = await Tenant.findById(req.user.tenantId);
  if (!tenant) {
    return next(new AppError('Tenant not found', 404));
  }

  const asset = await replaceTenantAsset({ tenant, file: req.file, assetType: 'favicon' });
  await createAuditLog({
    req,
    action: 'tenant.branding.favicon.upload',
    targetType: 'Tenant',
    targetId: tenant._id,
    metadata: { key: asset.key },
  });
  return sendData(res, 200, asset);
});

const getTenantAsset = catchAsync(async (req, res, next) => {
  if (!['logo', 'favicon'].includes(req.params.assetType)) {
    return next(new AppError('Unknown tenant asset', 404));
  }

  const tenant = await resolveTenantForPublicRequest(req);
  const key = req.params.assetType === 'favicon' ? tenant.faviconKey : tenant.logoKey;
  const externalUrl = req.params.assetType === 'favicon' ? tenant.faviconUrl : tenant.logoUrl;

  if (key) {
    return res.redirect(await getReadUrl(key));
  }

  if (externalUrl) {
    return res.redirect(externalUrl);
  }

  return next(new AppError('Tenant asset not found', 404));
});

module.exports = {
  getPublicTenantConfig,
  getTenantSettings,
  updateTenantSettings,
  uploadTenantLogo,
  uploadTenantFavicon,
  getTenantAsset,
};
