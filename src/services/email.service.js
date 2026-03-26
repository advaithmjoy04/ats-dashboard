const fs = require('fs');
const path = require('path');
const nodemailer = require('nodemailer');
const config = require('../config');
const { EmailLog } = require('../models');
const AppError = require('../utils/AppError');

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

async function send(email, type, subject, templateName, data) {
  const html = renderTemplate(templateName, data);
  try {
    await transporter.sendMail({
      from: config.smtpFrom,
      to: email,
      subject,
      html,
    });
    await EmailLog.create({ email, type, status: 'SENT', sentAt: new Date() });
  } catch (error) {
    await EmailLog.create({ email, type, status: 'FAILED', sentAt: new Date() });
    throw new AppError('Failed to send email. Check Gmail SMTP settings and App Password.', 500);
  }
}

async function sendAccountInvitation({ email, fullName, inviteLink, loginLink }) {
  await send(email, 'account.invitation', 'Activate your ATS account', 'account.invitation', {
    fullName,
    inviteLink,
    loginLink,
  });
}

async function sendPasswordReset({ email, fullName, resetLink }) {
  await send(email, 'password.reset', 'Reset your ATS password', 'password.reset', {
    fullName,
    resetLink,
  });
}

async function sendApplicationConfirmation({ email, fullName, jobTitle, companyName }) {
  await send(email, 'application.received', 'Application received', 'application.received', {
    fullName,
    jobTitle,
    companyName,
  });
}

async function sendApplicationStatusUpdate({ email, fullName, jobTitle, companyName, status }) {
  await send(email, 'application.status', 'Application status updated', 'application.status', {
    fullName,
    jobTitle,
    companyName,
    status,
  });
}

async function sendTestEmail({ email, fullName }) {
  await send(email, 'system.test', 'ATS Gmail test email', 'account.invitation', {
    fullName,
    inviteLink: config.frontendOrigin,
    loginLink: `${config.frontendOrigin}/login`,
  });
}

module.exports = {
  sendAccountInvitation,
  sendPasswordReset,
  sendApplicationConfirmation,
  sendApplicationStatusUpdate,
  sendTestEmail,
};
