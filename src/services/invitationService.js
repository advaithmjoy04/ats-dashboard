const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const { StudentProfile, Tenant, User } = require('../models');
const AppError = require('../utils/AppError');
const { hashToken } = require('./atsService');
const { sendAccountInvitation } = require('./email.service');
const { buildTenantAppOrigin, buildTenantAppUrl } = require('./tenantService');

function normalizeInviteEmail(email) {
  return String(email || '').trim().toLowerCase();
}

function normalizeInviteName(fullName) {
  return String(fullName || '').trim();
}

async function createPendingInvitationUser({ email, fullName, role, profile, appOrigin, tenantId }) {
  const effectiveTenantId = tenantId;
  const normalizedEmail = normalizeInviteEmail(email);
  const normalizedName = normalizeInviteName(fullName);
  const fallbackDisplayName = normalizedName || normalizedEmail;

  if (!normalizedEmail) {
    throw new AppError('Email is required', 400);
  }
  if (!effectiveTenantId) {
    throw new AppError('Tenant context is required to create invited users', 403);
  }

  const plainToken = crypto.randomBytes(32).toString('hex');
  const inviteToken = hashToken(plainToken);
  let user = await User.findOne({ email: normalizedEmail, tenantId: effectiveTenantId }).select('+inviteToken');
  let createdNewUser = false;

  if (user) {
    if (user.role !== role) {
      throw new AppError(`A user with ${normalizedEmail} already exists with role ${user.role}`, 409);
    }
    if (user.status === 'ACTIVE') {
      throw new AppError(`A ${role.toLowerCase()} with this email already exists`, 409);
    }

    user.fullName = fallbackDisplayName || user.fullName;
    user.tenantId = user.tenantId || effectiveTenantId;
    user.status = 'PENDING';
    user.inviteToken = inviteToken;
    user.inviteTokenExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000);
    user.password = await bcrypt.hash(crypto.randomBytes(16).toString('hex'), 10);
    await user.save();
  } else {
    const superAdminConflict = await User.findOne({ email: normalizedEmail, role: 'PLATFORM_SUPER_ADMIN' }).lean();
    if (superAdminConflict) {
      throw new AppError('This email belongs to a platform super admin account', 409);
    }

    user = await User.create({
      email: normalizedEmail,
      fullName: fallbackDisplayName,
      tenantId: effectiveTenantId,
      password: await bcrypt.hash(crypto.randomBytes(16).toString('hex'), 10),
      role,
      status: 'PENDING',
      inviteToken,
      inviteTokenExpiry: new Date(Date.now() + 24 * 60 * 60 * 1000),
    });
    createdNewUser = true;
  }

  try {
    if (profile) {
      const cleanedProfile = Object.fromEntries(
        Object.entries(profile).filter(([, value]) => value !== undefined && value !== null && value !== '')
      );
      const profileFullName = normalizeInviteName(cleanedProfile.fullName) || fallbackDisplayName;
      const existingProfile = await StudentProfile.findOne({ userId: user._id, tenantId: effectiveTenantId });
      if (existingProfile) {
        Object.assign(existingProfile, {
          tenantId: existingProfile.tenantId || effectiveTenantId,
          ...cleanedProfile,
          fullName: profileFullName || existingProfile.fullName,
        });
        await existingProfile.save();
      } else {
        await StudentProfile.create({
          tenantId: effectiveTenantId,
          userId: user._id,
          ...cleanedProfile,
          fullName: profileFullName,
        });
      }
    }

    const tenant = await Tenant.findById(effectiveTenantId).lean();
    const tenantAppOrigin = buildTenantAppOrigin(tenant, { frontendOrigin: appOrigin });

    await sendAccountInvitation({
      email: normalizedEmail,
      fullName: fallbackDisplayName,
      inviteLink: buildTenantAppUrl(tenant, '/activate', {
        frontendOrigin: appOrigin,
        query: { token: plainToken },
      }),
      loginLink: buildTenantAppUrl(tenant, '/login', {
        frontendOrigin: appOrigin,
      }),
      tenantId: effectiveTenantId,
      appOrigin: tenantAppOrigin || appOrigin,
    });
  } catch (error) {
    if (profile && !createdNewUser) {
      // Keep existing user/profile records when resend email fails.
    } else if (profile) {
      await StudentProfile.deleteOne({ userId: user._id, tenantId: effectiveTenantId });
      await User.deleteOne({ _id: user._id, tenantId: effectiveTenantId });
    } else if (!createdNewUser) {
      // Keep existing recruiter records when resend email fails.
    } else {
      await User.deleteOne({ _id: user._id, tenantId: effectiveTenantId });
    }
    throw error;
  }

  return {
    user,
    wasExistingUser: !createdNewUser,
  };
}

module.exports = {
  createPendingInvitationUser,
  normalizeInviteEmail,
  normalizeInviteName,
};
