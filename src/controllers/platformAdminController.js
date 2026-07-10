const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const { Application, AuditLog, EmailLog, Job, StudentProfile, Tenant, User } = require('../models');
const { createAuditLog, createPendingInvitationUser, deleteObject, sendAccountInvitation } = require('../services');
const { hashToken } = require('../services/atsService');
const { buildTenantAppOrigin, buildTenantAppUrl, slugifyTenantName, normalizeHost } = require('../services/tenantService');
const AppError = require('../utils/AppError');
const catchAsync = require('../utils/catchAsync');
const { getRequestOrigin } = require('../utils/requestOrigin');
const { sendData, sendMessage } = require('../utils/response');
const { verifyPasswordConfirmation } = require('../utils/passwordConfirmation');
const { assertValidPassword } = require('../utils/passwordValidation');
const config = require('../config');

function sanitizeOriginList(values = []) {
  return [...new Set(
    values
      .map((value) => {
        try {
          return new URL(String(value).trim()).origin.toLowerCase();
        } catch (error) {
          return '';
        }
      })
      .filter(Boolean)
  )];
}

function normalizeUsername(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, '')
    .slice(0, 60);
}

async function ensureUniqueTenantFields({ tenantId, slug, subdomain, customDomain }) {
  const filters = [];
  if (slug) filters.push({ slug });
  if (subdomain) filters.push({ subdomain });
  if (customDomain) filters.push({ customDomain });
  if (!filters.length) return;

  const conflict = await Tenant.findOne({
    ...(tenantId ? { _id: { $ne: tenantId } } : {}),
    $or: filters,
  }).lean();

  if (!conflict) return;

  if (slug && conflict.slug === slug) throw new AppError('Tenant slug already exists', 409);
  if (subdomain && conflict.subdomain === subdomain) throw new AppError('Tenant subdomain already exists', 409);
  if (customDomain && conflict.customDomain === customDomain) throw new AppError('Tenant custom domain already exists', 409);
}

async function ensureTenantExists(tenantId) {
  const tenant = await Tenant.findById(tenantId);
  if (!tenant) {
    throw new AppError('Tenant not found', 404);
  }
  return tenant;
}

async function createTenantAdminAccount({
  tenant,
  fullName,
  email,
  username,
  password,
  req,
}) {
  const normalizedEmail = String(email || '').trim().toLowerCase();
  const normalizedUsername = username ? normalizeUsername(username) : '';
  const tempPassword = String(password || '');
  const appOrigin = getRequestOrigin(req, {
    frontendOrigin: config.frontendOrigin,
    nodeEnv: config.nodeEnv,
  });

  const emailConflict = await User.findOne({ email: normalizedEmail }).lean();
  if (emailConflict) {
    throw new AppError('Admin email already exists', 409);
  }

  if (normalizedUsername) {
    const usernameConflict = await User.findOne({ tenantId: tenant._id, username: normalizedUsername }).lean();
    if (usernameConflict) {
      throw new AppError('Admin username already exists in this institute', 409);
    }
  }

  if (tempPassword) {
    assertValidPassword(tempPassword, 'Temporary password');
    const admin = await User.create({
      tenantId: tenant._id,
      fullName: String(fullName || '').trim(),
      username: normalizedUsername || undefined,
      email: normalizedEmail,
      password: await bcrypt.hash(tempPassword, 10),
      role: 'ADMIN',
      status: 'ACTIVE',
      forcePasswordChange: true,
    });

    return {
      admin,
      provisionMethod: 'temporary-password',
    };
  }

  const { user } = await createPendingInvitationUser({
    email: normalizedEmail,
    fullName: String(fullName || '').trim(),
    role: 'ADMIN',
    tenantId: tenant._id,
    appOrigin,
  });

  if (normalizedUsername && !user.username) {
    user.username = normalizedUsername;
    await user.save();
  }

  return {
    admin: user,
    provisionMethod: 'invite',
  };
}

async function getTenantAdmins(tenantId) {
  return User.find({
    tenantId,
    role: 'ADMIN',
    status: { $ne: 'INACTIVE' },
  })
    .sort({ createdAt: 1 })
    .select('fullName email username status forcePasswordChange createdAt')
    .lean();
}

async function verifyPlatformPassword(req) {
  return verifyPasswordConfirmation({
    userId: req.user.id,
    role: 'PLATFORM_SUPER_ADMIN',
    passwordConfirmation: req.body.passwordConfirmation,
    req,
    action: 'platform.privileged_action.denied',
  });
}

const listTenants = catchAsync(async (req, res) => {
  const tenants = await Tenant.find().sort({ createdAt: -1 }).lean();
  return sendData(res, 200, tenants);
});

const getTenant = catchAsync(async (req, res, next) => {
  const tenant = await Tenant.findById(req.params.id).lean();
  if (!tenant) {
    return next(new AppError('Tenant not found', 404));
  }
  const admins = await getTenantAdmins(tenant._id);
  return sendData(res, 200, { ...tenant, admins });
});

const createTenant = catchAsync(async (req, res) => {
  const appOrigin = getRequestOrigin(req, {
    frontendOrigin: config.frontendOrigin,
    nodeEnv: config.nodeEnv,
  });
  const normalizedEmail = req.body.adminEmail.toLowerCase();
  const adminUsername = req.body.adminUsername ? normalizeUsername(req.body.adminUsername) : '';
  const adminPassword = String(req.body.adminPassword || '');
  const tenantName = req.body.name.trim();
  const slug = slugifyTenantName(req.body.slug || tenantName);
  const subdomain = req.body.subdomain ? slugifyTenantName(req.body.subdomain) : undefined;
  const customDomain = req.body.customDomain ? normalizeHost(req.body.customDomain) : undefined;
  const allowedOrigins = sanitizeOriginList(req.body.allowedOrigins || []);

  await ensureUniqueTenantFields({ slug, subdomain, customDomain });

  const existingAdmin = await User.findOne({ email: normalizedEmail }).lean();
  if (existingAdmin) {
    throw new AppError('This first admin email is already used by another platform account', 409);
  }
  if (adminUsername) {
    const usernameConflict = await User.findOne({ username: adminUsername }).lean();
    if (usernameConflict) {
      throw new AppError('Admin username already exists', 409);
    }
  }
  if (adminPassword) {
    assertValidPassword(adminPassword, 'Temporary password');
  }

  const tenant = await Tenant.create({
    name: tenantName,
    slug,
    subdomain,
    customDomain,
    allowedOrigins,
    supportEmail: req.body.supportEmail || normalizedEmail,
    emailFromName: req.body.emailFromName || tenantName,
    loginHeadline: req.body.loginHeadline || `Sign in to ${tenantName}`,
    loginSubtext: req.body.loginSubtext || 'Manage jobs, applications, and placement activity securely.',
    isActive: req.body.isActive !== false,
  });

  try {
    let plainToken = '';
    const userPayload = {
      tenantId: tenant._id,
      fullName: req.body.adminFullName.trim(),
      username: adminUsername || undefined,
      email: normalizedEmail,
      role: 'ADMIN',
    };

    if (adminPassword) {
      Object.assign(userPayload, {
        password: await bcrypt.hash(adminPassword, 10),
        status: 'ACTIVE',
        forcePasswordChange: true,
      });
    } else {
      plainToken = crypto.randomBytes(32).toString('hex');
      Object.assign(userPayload, {
        password: await bcrypt.hash(crypto.randomBytes(16).toString('hex'), 10),
        status: 'PENDING',
        inviteToken: hashToken(plainToken),
        inviteTokenExpiry: new Date(Date.now() + 24 * 60 * 60 * 1000),
      });
    }

    const user = await User.create(userPayload);

    if (!adminPassword) {
      const tenantAppOrigin = buildTenantAppOrigin(tenant, { frontendOrigin: appOrigin });
      await sendAccountInvitation({
        email: user.email,
        fullName: user.fullName,
        inviteLink: buildTenantAppUrl(tenant, '/activate', {
          frontendOrigin: appOrigin,
          query: { token: plainToken },
        }),
        loginLink: buildTenantAppUrl(tenant, '/login', {
          frontendOrigin: appOrigin,
        }),
        tenantId: tenant._id,
        appOrigin: tenantAppOrigin || appOrigin,
      });
    }

    await createAuditLog({
      req,
      tenantId: tenant._id,
      action: 'tenant.create',
      targetType: 'Tenant',
      targetId: tenant._id,
      metadata: {
        name: tenant.name,
        slug: tenant.slug,
        subdomain: tenant.subdomain || '',
        customDomain: tenant.customDomain || '',
        adminEmail: user.email,
        adminUsername: user.username || '',
        provisionMethod: adminPassword ? 'temporary-password' : 'invite',
      },
    });

    return sendData(res, 201, {
      tenant,
      admin: {
        id: user._id,
        email: user.email,
        username: user.username || '',
        fullName: user.fullName,
        status: user.status,
        forcePasswordChange: Boolean(user.forcePasswordChange),
      },
    });
  } catch (error) {
    await User.deleteMany({ tenantId: tenant._id });
    await Tenant.deleteOne({ _id: tenant._id });
    throw error;
  }
});

const updateTenant = catchAsync(async (req, res, next) => {
  const tenant = await ensureTenantExists(req.params.id);

  const updates = {};
  if (req.body.name !== undefined) updates.name = req.body.name.trim();
  if (req.body.slug !== undefined) updates.slug = slugifyTenantName(req.body.slug);
  if (req.body.subdomain !== undefined) updates.subdomain = req.body.subdomain ? slugifyTenantName(req.body.subdomain) : undefined;
  if (req.body.customDomain !== undefined) updates.customDomain = req.body.customDomain ? normalizeHost(req.body.customDomain) : undefined;
  if (req.body.allowedOrigins !== undefined) updates.allowedOrigins = sanitizeOriginList(req.body.allowedOrigins);
  if (req.body.supportEmail !== undefined) updates.supportEmail = req.body.supportEmail || '';
  if (req.body.emailFromName !== undefined) updates.emailFromName = req.body.emailFromName || '';
  if (req.body.loginHeadline !== undefined) updates.loginHeadline = req.body.loginHeadline || '';
  if (req.body.loginSubtext !== undefined) updates.loginSubtext = req.body.loginSubtext || '';
  if (req.body.isActive !== undefined) updates.isActive = Boolean(req.body.isActive);

  await ensureUniqueTenantFields({
    tenantId: tenant._id,
    slug: updates.slug,
    subdomain: updates.subdomain,
    customDomain: updates.customDomain,
  });

  Object.assign(tenant, updates);
  await tenant.save();
  await createAuditLog({
    req,
    tenantId: tenant._id,
    action: 'tenant.update',
    targetType: 'Tenant',
    targetId: tenant._id,
    metadata: {
      updatedFields: Object.keys(updates),
      slug: tenant.slug,
      subdomain: tenant.subdomain || '',
      customDomain: tenant.customDomain || '',
      isActive: tenant.isActive,
    },
  });
  return sendData(res, 200, tenant);
});

const listTenantAdmins = catchAsync(async (req, res) => {
  await ensureTenantExists(req.params.id);
  return sendData(res, 200, await getTenantAdmins(req.params.id));
});

const createTenantAdmin = catchAsync(async (req, res) => {
  const tenant = await ensureTenantExists(req.params.id);
  if (!tenant.isActive) {
    throw new AppError('Activate the institute before adding more admins', 400);
  }

  const { admin, provisionMethod } = await createTenantAdminAccount({
    tenant,
    fullName: req.body.fullName,
    email: req.body.email,
    username: req.body.username,
    password: req.body.password,
    req,
  });

  await createAuditLog({
    req,
    tenantId: tenant._id,
    action: 'tenant.admin.create',
    targetType: 'User',
    targetId: admin._id,
    metadata: {
      tenantName: tenant.name,
      email: admin.email,
      username: admin.username || '',
      provisionMethod,
    },
  });

  return sendData(res, 201, {
    id: admin._id,
    fullName: admin.fullName,
    email: admin.email,
    username: admin.username || '',
    status: admin.status,
    forcePasswordChange: Boolean(admin.forcePasswordChange),
  });
});

const deleteTenantAdmin = catchAsync(async (req, res, next) => {
  await verifyPlatformPassword(req);
  const tenant = await ensureTenantExists(req.params.id);
  const admin = await User.findOne({
    _id: req.params.userId,
    tenantId: tenant._id,
    role: 'ADMIN',
  });

  if (!admin) {
    return next(new AppError('Tenant admin not found', 404));
  }

  const remainingAdmins = await User.countDocuments({
    tenantId: tenant._id,
    role: 'ADMIN',
    status: { $ne: 'INACTIVE' },
    _id: { $ne: admin._id },
  });

  if (remainingAdmins < 1) {
    throw new AppError('Each institute must keep at least one active admin', 400);
  }

  await User.deleteOne({ _id: admin._id, tenantId: tenant._id, role: 'ADMIN' });

  await createAuditLog({
    req,
    tenantId: tenant._id,
    action: 'tenant.admin.delete',
    targetType: 'User',
    targetId: admin._id,
    metadata: {
      tenantName: tenant.name,
      email: admin.email,
      username: admin.username || '',
    },
  });

  return sendMessage(res, 200, 'Tenant admin removed successfully');
});

const deactivateTenant = catchAsync(async (req, res, next) => {
  await verifyPlatformPassword(req);
  const tenant = await Tenant.findByIdAndUpdate(req.params.id, { isActive: false }, { new: true });
  if (!tenant) {
    return next(new AppError('Tenant not found', 404));
  }
  await createAuditLog({
    req,
    tenantId: tenant._id,
    action: 'tenant.deactivate',
    targetType: 'Tenant',
    targetId: tenant._id,
    metadata: { name: tenant.name },
  });
  return sendData(res, 200, tenant);
});

const activateTenant = catchAsync(async (req, res, next) => {
  const tenant = await Tenant.findByIdAndUpdate(req.params.id, { isActive: true }, { new: true });
  if (!tenant) {
    return next(new AppError('Tenant not found', 404));
  }
  await createAuditLog({
    req,
    tenantId: tenant._id,
    action: 'tenant.activate',
    targetType: 'Tenant',
    targetId: tenant._id,
    metadata: { name: tenant.name },
  });
  return sendData(res, 200, tenant);
});

const deleteTenant = catchAsync(async (req, res, next) => {
  await verifyPlatformPassword(req);
  const tenant = await Tenant.findById(req.params.id);
  if (!tenant) {
    return next(new AppError('Tenant not found', 404));
  }

  const [applications, jobs] = await Promise.all([
    Application.find({ tenantId: tenant._id }).lean(),
    Job.find({ tenantId: tenant._id }).lean(),
  ]);

  const assetKeys = [
    ...applications.map((application) => application.resumeKey).filter(Boolean),
    tenant.logoKey,
    tenant.faviconKey,
  ].filter(Boolean);

  await Promise.all(assetKeys.map((key) => deleteObject(key).catch(() => {})));
  await Promise.all([
    Application.deleteMany({ tenantId: tenant._id }),
    Job.deleteMany({ tenantId: tenant._id }),
    StudentProfile.deleteMany({ tenantId: tenant._id }),
    EmailLog.deleteMany({ tenantId: tenant._id }),
    AuditLog.deleteMany({ tenantId: tenant._id }),
    User.deleteMany({ tenantId: tenant._id }),
  ]);
  await Tenant.deleteOne({ _id: tenant._id });

  await createAuditLog({
    req,
    action: 'tenant.delete',
    targetType: 'Tenant',
    targetId: tenant._id,
    metadata: {
      name: tenant.name,
      slug: tenant.slug,
      deletedJobs: jobs.length,
      deletedApplications: applications.length,
    },
  });

  return sendMessage(res, 200, 'Tenant deleted successfully');
});

module.exports = {
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
};
