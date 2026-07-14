const nodemailer = require('nodemailer');

function isEmailConfigured() {
  return Boolean(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);
}

let transporter = null;
if (isEmailConfigured()) {
  transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: String(process.env.SMTP_SECURE).toLowerCase() === 'true',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS
    }
  });
}

async function sendVerificationEmail(email, token) {
  if (!transporter) {
    return;
  }
  const verifyUrl = `${process.env.APP_URL}/api/auth/verify-email?token=${encodeURIComponent(token)}`;
  await transporter.sendMail({
    from: process.env.SMTP_FROM,
    to: email,
    subject: 'Verify your MeetSpace account',
    html: `<p>Welcome to MeetSpace.</p><p>Click <a href="${verifyUrl}">here</a> to verify your email.</p><p>This verification link expires in 15 minutes.</p>`
  });
}

async function sendResetEmail(email, token) {
  if (!transporter) {
    return;
  }
  const resetUrl = `${process.env.CLIENT_URL}/reset-password.html?token=${encodeURIComponent(token)}`;
  await transporter.sendMail({
    from: process.env.SMTP_FROM,
    to: email,
    subject: 'Reset your MeetSpace password',
    html: `<p>You requested a password reset.</p><p>Click <a href="${resetUrl}">here</a> to set a new password.</p><p>This reset link expires in 15 minutes.</p>`
  });
}

module.exports = {
  isEmailConfigured,
  sendVerificationEmail,
  sendResetEmail
};
