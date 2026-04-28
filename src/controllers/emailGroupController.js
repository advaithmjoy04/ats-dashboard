const { EmailGroup } = require('../models');
const { createAuditLog, createPendingInvitationUser, normalizeInviteEmail, normalizeInviteName } = require('../services');
const AppError = require('../utils/AppError');
const catchAsync = require('../utils/catchAsync');
const { getRequestOrigin } = require('../utils/requestOrigin');
const { sendData, sendMessage } = require('../utils/response');
const config = require('../config');

const MAX_GROUP_MEMBERS = 500;
const BULK_INVITE_COOLDOWN_MS = 60 * 1000;

function normalizeMembers(rawMembers = []) {
  const seenEmails = new Set();
  const members = [];

  for (const entry of Array.isArray(rawMembers) ? rawMembers : []) {
    const email = normalizeInviteEmail(entry?.email);
    const fullName = normalizeInviteName(entry?.fullName);

    if (!email || seenEmails.has(email)) {
      continue;
    }

    seenEmails.add(email);
    members.push({
      email,
      fullName,
      status: 'PENDING',
      lastError: '',
      userId: undefined,
      lastInvitedAt: undefined,
    });
  }

  return members;
}

function serializeGroup(group) {
  return {
    id: group._id,
    name: group.name,
    role: group.role,
    description: group.description || '',
    createdBy: group.createdBy,
    lastSentAt: group.lastSentAt,
    memberCount: group.members.length,
    members: group.members.map((member) => ({
      id: member._id,
      email: member.email,
      fullName: member.fullName || member.email || '',
      status: member.status,
      lastInvitedAt: member.lastInvitedAt || null,
      lastError: member.lastError || '',
      userId: member.userId || null,
    })),
    createdAt: group.createdAt,
    updatedAt: group.updatedAt,
  };
}

function ensureGroupEditable(group) {
  if (!group) {
    throw new AppError('Email group not found', 404);
  }
}

async function ensureUniqueGroupName({ tenantId, name, excludeId }) {
  const existingGroup = await EmailGroup.findOne({
    tenantId,
    name,
    ...(excludeId ? { _id: { $ne: excludeId } } : {}),
  }).lean();

  if (existingGroup) {
    throw new AppError('An email group with this name already exists', 409);
  }
}

const listEmailGroups = catchAsync(async (req, res) => {
  const groups = await EmailGroup.find({ tenantId: req.user.tenantId }).sort({ updatedAt: -1 }).lean();
  return sendData(res, 200, groups.map(serializeGroup));
});

const createEmailGroup = catchAsync(async (req, res) => {
  const name = String(req.body.name || '').trim();
  const members = normalizeMembers(req.body.members);
  if (members.length > MAX_GROUP_MEMBERS) {
    throw new AppError(`Email groups can contain at most ${MAX_GROUP_MEMBERS} members`, 400);
  }

  await ensureUniqueGroupName({ tenantId: req.user.tenantId, name });

  const group = await EmailGroup.create({
    tenantId: req.user.tenantId,
    name,
    role: req.body.role,
    description: String(req.body.description || '').trim(),
    createdBy: req.user.id,
    members,
  });

  await createAuditLog({
    req,
    action: 'tenant.email-group.create',
    targetType: 'EmailGroup',
    targetId: group._id,
    metadata: { name: group.name, role: group.role, memberCount: group.members.length },
  });

  return sendData(res, 201, serializeGroup(group));
});

const updateEmailGroup = catchAsync(async (req, res) => {
  const group = await EmailGroup.findOne({ _id: req.params.id, tenantId: req.user.tenantId });
  ensureGroupEditable(group);

  const name = String(req.body.name || '').trim();
  const nextMembers = normalizeMembers(req.body.members);
  if (nextMembers.length > MAX_GROUP_MEMBERS) {
    throw new AppError(`Email groups can contain at most ${MAX_GROUP_MEMBERS} members`, 400);
  }

  await ensureUniqueGroupName({ tenantId: req.user.tenantId, name, excludeId: group._id });

  const existingMembersByEmail = new Map(group.members.map((member) => [member.email, member]));
  group.name = name;
  group.role = req.body.role;
  group.description = String(req.body.description || '').trim();
  group.members = nextMembers.map((member) => {
    const existingMember = existingMembersByEmail.get(member.email);
    return {
      ...member,
      status: existingMember?.status || 'PENDING',
      userId: existingMember?.userId || undefined,
      lastInvitedAt: existingMember?.lastInvitedAt || undefined,
      lastError: existingMember?.lastError || '',
    };
  });
  await group.save();

  await createAuditLog({
    req,
    action: 'tenant.email-group.update',
    targetType: 'EmailGroup',
    targetId: group._id,
    metadata: { name: group.name, role: group.role, memberCount: group.members.length },
  });

  return sendData(res, 200, serializeGroup(group));
});

const deleteEmailGroup = catchAsync(async (req, res) => {
  const group = await EmailGroup.findOneAndDelete({ _id: req.params.id, tenantId: req.user.tenantId });
  ensureGroupEditable(group);

  await createAuditLog({
    req,
    action: 'tenant.email-group.delete',
    targetType: 'EmailGroup',
    targetId: group._id,
    metadata: { name: group.name, role: group.role, memberCount: group.members.length },
  });

  return sendMessage(res, 200, 'Email group deleted successfully');
});

const sendGroupActivations = catchAsync(async (req, res) => {
  const group = await EmailGroup.findOne({ _id: req.params.id, tenantId: req.user.tenantId });
  ensureGroupEditable(group);

  if (!group.members.length) {
    throw new AppError('Add at least one email to the group before sending activations', 400);
  }

  if (group.lastSentAt && Date.now() - new Date(group.lastSentAt).getTime() < BULK_INVITE_COOLDOWN_MS) {
    throw new AppError('Please wait a minute before sending activations to this group again', 429);
  }

  const appOrigin = getRequestOrigin(req, {
    frontendOrigin: config.frontendOrigin,
    nodeEnv: config.nodeEnv,
  });
  const results = [];

  for (const member of group.members) {
    const fallbackName = member.fullName || member.email;

    try {
      const { user } = await createPendingInvitationUser({
        email: member.email,
        fullName: fallbackName,
        role: group.role,
        tenantId: req.user.tenantId,
        appOrigin,
        profile:
          group.role === 'STUDENT'
            ? {
                fullName: fallbackName,
                profileCompleted: false,
              }
            : undefined,
      });

      if (group.role === 'STUDENT' && !member.fullName) {
        member.fullName = fallbackName;
      }
      member.userId = user._id;
      member.status = user.status === 'ACTIVE' ? 'ACTIVE' : 'INVITED';
      member.lastInvitedAt = new Date();
      member.lastError = '';
      results.push({
        email: member.email,
        fullName: member.fullName || fallbackName,
        status: 'INVITED',
      });
    } catch (error) {
      const message = error.message || 'Unable to send activation';
      member.status = message.toLowerCase().includes('already exists') ? 'ACTIVE' : 'FAILED';
      member.lastError = message;
      results.push({
        email: member.email,
        fullName: member.fullName || fallbackName,
        status: member.status,
        error: message,
      });
    }
  }

  group.lastSentAt = new Date();
  await group.save();

  const successCount = results.filter((result) => result.status === 'INVITED').length;
  const failureCount = results.length - successCount;

  await createAuditLog({
    req,
    action: 'tenant.email-group.send-activations',
    targetType: 'EmailGroup',
    targetId: group._id,
    metadata: {
      name: group.name,
      role: group.role,
      memberCount: group.members.length,
      successCount,
      failureCount,
    },
  });

  return sendData(res, 200, {
    group: serializeGroup(group),
    results,
    successCount,
    failureCount,
  });
});

module.exports = {
  listEmailGroups,
  createEmailGroup,
  updateEmailGroup,
  deleteEmailGroup,
  sendGroupActivations,
};
