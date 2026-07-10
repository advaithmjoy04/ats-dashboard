const fs = require('fs');
const path = require('path');
const nodemailer = require('nodemailer');
const config = require('../config');
const { EmailLog, Tenant } = require('../models');
const AppError = require('../utils/AppError');
const { getDefaultTenantId } = require('./tenantService');

const transporter = nodemailer.createTransport({
  host: config.smtpHost,
  port: config.smtpPort,
  secure: false,
  auth: {
    user: config.smtpUser,
    pass: config.smtpPass,
  },
});

function renderTemplate(templateName, data) {
  const templatePath = path.join(__dirname, '..', 'templates', 'emails', `${templateName}.html`);
  let content = fs.readFileSync(templatePath, 'utf-8');
  for (const [key, value] of Object.entries(data)) {
    content = content.replace(new RegExp(`{{${key}}}`, 'g'), value ?? '');
  }
  return content;
}

function buildFromAddress(emailFromName) {
  if (!emailFromName) {
    return config.smtpFrom;
  }
  return `"${String(emailFromName).replace(/"/g, '')}" <${config.smtpFrom}>`;
}

async function resolveTenantBranding({ tenantId, appOrigin }) {
  const effectiveTenantId = tenantId || (await getDefaultTenantId());
  const tenant = await Tenant.findById(effectiveTenantId).lean();

  return {
    tenantId: effectiveTenantId,
    brandName: tenant?.name || 'ATS Platform',
    supportEmail: tenant?.supportEmail || config.smtpFrom,
    emailFromName: tenant?.emailFromName || tenant?.name || 'ATS Platform',
    logoUrl: tenant?.logoKey ? `${appOrigin}/api/v1/tenant/assets/logo` : tenant?.logoUrl || '',
  };
}

async function send(email, type, subject, templateName, data, options = {}) {
  const appOrigin = options.appOrigin || config.frontendOrigin || '';
  const branding = await resolveTenantBranding({ tenantId: options.tenantId, appOrigin });
  const html = renderTemplate(templateName, {
    ...data,
    brandName: branding.brandName,
    supportEmail: branding.supportEmail,
    logoUrl: branding.logoUrl,
    appOrigin,
  });

  if (config.nodeEnv === 'test') {
    await EmailLog.create({ tenantId: branding.tenantId, email, type, status: 'SENT', sentAt: new Date() });
    return { skipped: true, subject, html };
  }

  try {
    await transporter.sendMail({
      from: buildFromAddress(branding.emailFromName),
      to: email,
      subject,
      html,
    });
    await EmailLog.create({ tenantId: branding.tenantId, email, type, status: 'SENT', sentAt: new Date() });
  } catch (error) {
    await EmailLog.create({ tenantId: branding.tenantId, email, type, status: 'FAILED', sentAt: new Date() });
    throw new AppError('Failed to send email. Check Gmail SMTP settings and App Password.', 500);
  }
}

async function sendAccountInvitation({ email, fullName, inviteLink, loginLink, tenantId, appOrigin }) {
  await send(email, 'account.invitation', 'Activate your ATS account', 'account.invitation', {
    fullName,
    inviteLink,
    loginLink,
  }, { tenantId, appOrigin });
}

async function sendPasswordReset({ email, fullName, resetLink, tenantId, appOrigin }) {
  await send(email, 'password.reset', 'Reset your ATS password', 'password.reset', {
    fullName,
    resetLink,
  }, { tenantId, appOrigin });
}

async function sendApplicationConfirmation({ email, fullName, jobTitle, companyName, tenantId, appOrigin }) {
  await send(email, 'application.received', 'Application received', 'application.received', {
    fullName,
    jobTitle,
    companyName,
  }, { tenantId, appOrigin });
}

async function sendApplicationStatusUpdate({ email, fullName, jobTitle, companyName, status, tenantId, appOrigin }) {
  await send(email, 'application.status', 'Application status updated', 'application.status', {
    fullName,
    jobTitle,
    companyName,
    status,
  }, { tenantId, appOrigin });
}

async function sendTestEmail({ email, fullName, appOrigin = config.frontendOrigin, tenantId }) {
  await send(email, 'system.test', 'ATS Gmail test email', 'account.invitation', {
    fullName,
    inviteLink: appOrigin,
    loginLink: `${appOrigin}/login`,
  }, { tenantId, appOrigin });
}

module.exports = {
  sendAccountInvitation,
  sendPasswordReset,
  sendApplicationConfirmation,
  sendApplicationStatusUpdate,
  sendTestEmail,
};
