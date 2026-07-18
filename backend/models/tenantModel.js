const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const db = require('../config/db');

async function findByEmail(email) {
  const [rows] = await db.query('SELECT * FROM tenants WHERE email = ? LIMIT 1', [String(email || '').toLowerCase().trim()]);
  return rows[0] || null;
}

async function findById(id) {
  const [rows] = await db.query('SELECT * FROM tenants WHERE id = ? LIMIT 1', [id]);
  return rows[0] || null;
}

async function createTenant(payload) {
  const hashed = await bcrypt.hash(payload.password, 12);
  const normalizedName = payload.full_name.trim();
  const verificationToken = crypto.randomBytes(32).toString('hex');
  const verificationExpiresAt = new Date(Date.now() + 15 * 60 * 1000);
  const isEmailVerified = payload.is_email_verified ? 1 : 0; // Support auto-verification for dev mode

  const result = await db.query(
    `INSERT INTO tenants
        (full_name, email, phone_number, password_hash, profile_picture, email_verification_token, email_verification_expires, is_email_verified, auth_provider, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'local', NOW(), NOW())`,
    [
      normalizedName,
      String(payload.email).toLowerCase().trim(),
      payload.phone_number || null,
      hashed,
      payload.profile_picture || null,
      verificationToken,
      verificationExpiresAt,
      isEmailVerified
    ]
  );

  return {
    id: result.insertId,
    verificationToken
  };
}



async function setVerificationStatus(token) {
  const [rows] = await db.query(
    `SELECT id FROM tenants
     WHERE email_verification_token = ?
         AND email_verification_expires > NOW()
     LIMIT 1`,
    [token]
  );

  if (!rows[0]) {
    return false;
  }

  await db.query(
    `UPDATE tenants
     SET is_email_verified = 1,
         email_verification_token = NULL,
         email_verification_expires = NULL,
           updated_at = NOW()
     WHERE id = ?`,
    [rows[0].id]
  );

  return true;
}

async function setResetToken(email, token) {
  const expires = new Date(Date.now() + 15 * 60 * 1000);
  await db.query(
    `UPDATE tenants
     SET reset_token = ?,
         reset_token_expires = ?,
           updated_at = NOW()
     WHERE email = ?`,
    [token, expires, String(email).toLowerCase().trim()]
  );
}

async function resetPasswordByToken(token, newPassword) {
  const [rows] = await db.query(
    `SELECT id FROM tenants
     WHERE reset_token = ?
         AND reset_token_expires > NOW()
     LIMIT 1`,
    [token]
  );

  if (!rows[0]) {
    return false;
  }

  const hashed = await bcrypt.hash(newPassword, 12);
  await db.query(
    `UPDATE tenants
     SET password = ?,
         password_hash = ?,
         reset_token = NULL,
         reset_token_expires = NULL,
           updated_at = NOW()
     WHERE id = ?`,
    [hashed, hashed, rows[0].id]
  );

  return true;
}

async function comparePassword(rawPassword, hash) {
  if (!hash) return false;
  try {
    return await bcrypt.compare(rawPassword, hash);
  } catch (_) {
    return rawPassword === hash;
  }
}

module.exports = {
  findByEmail,
  findById,
  createTenant,
  setVerificationStatus,
  setResetToken,
  resetPasswordByToken,
  comparePassword
};
