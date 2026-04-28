const { AuditLog } = require('../models');

function getClientIp(req) {
  const forwarded = req?.headers?.['x-forwarded-for'];
  if (typeof forwarded === 'string' && forwarded.trim()) {
    return forwarded.split(',')[0].trim();
  }
  return req?.ip || req?.socket?.remoteAddress || '';
}

async function createAuditLog({
  req,
  tenantId,
  actorUserId,
  actorRole,
  action,
  targetType,
  targetId,
  status = 'SUCCESS',
  metadata = {},
}) {
  if (!action) {
    return null;
  }

  return AuditLog.create({
    tenantId: tenantId || req?.user?.tenantId || req?.tenant?.id || undefined,
    actorUserId: actorUserId || req?.user?.id || undefined,
    actorRole: actorRole || req?.user?.role || undefined,
    action,
    targetType: targetType || '',
    targetId: targetId ? String(targetId) : '',
    status,
    ipAddress: getClientIp(req),
    method: req?.method || '',
    path: req?.originalUrl || req?.url || '',
    metadata,
  });
}

module.exports = {
  createAuditLog,
};
