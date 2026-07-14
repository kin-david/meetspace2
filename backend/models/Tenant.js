// models/Tenant.js
// Database operations for the tenants table

const db = require('../config/db');
const bcrypt = require('bcryptjs');

const Tenant = {
  async findByEmail(email) {
    const [rows] = await db.execute('SELECT * FROM tenants WHERE email = ?', [email]);
    return rows[0] || null;
  },

  async findById(id) {
    const [rows] = await db.execute(
      `SELECT
         id,
         full_name AS name,
         email,
         is_email_verified,
         auth_provider,
         created_at AS joined_at,
         updated_at
       FROM tenants
       WHERE id = ?`,
      [id]
    );
    return rows[0] || null;
  },

  async getAll() {
    const [rows] = await db.execute(`
      SELECT
        t.id,
        t.full_name AS name,
        t.email,
        IF(t.is_email_verified = 1, 'active', 'inactive') AS status,
        DATE_FORMAT(t.created_at, '%Y-%m') AS joined,
        COUNT(b.id) AS bookings
      FROM tenants t
      LEFT JOIN bookings b ON b.tenant_id = t.id
      GROUP BY t.id
      ORDER BY t.created_at DESC
    `);
    return rows;
  },

  async create({ name, email, password, authProvider = 'local', rememberMe = 0, lastLoginAt = null }) {
    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash(password, salt);

    const [result] = await db.execute(
      `INSERT INTO tenants
        (full_name, email, phone_number, password_hash, profile_picture, is_email_verified, auth_provider, created_at, updated_at)
       VALUES (?, ?, NULL, ?, NULL, ?, ?, NOW(), NOW())`,
      [name.trim(), email.toLowerCase().trim(), hash, rememberMe ? 1 : 0, authProvider]
    );
    return result.insertId;
  },

  async updatePassword(id, password) {
    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash(password, salt);
    const [result] = await db.execute(
      'UPDATE tenants SET password_hash = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [hash, id]
    );
    return result.affectedRows > 0;
  },

  async updateAuthMeta(id, { authProvider, rememberMe = 0 }) {
    const [result] = await db.execute(
      'UPDATE tenants SET auth_provider = ?, is_email_verified = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [authProvider || 'local', rememberMe ? 1 : 0, id]
    );
    return result.affectedRows > 0;
  },

  async updateStatus(id, status) {
    const isVerified = status === 'active' ? 1 : 0;
    const [result] = await db.execute('UPDATE tenants SET is_email_verified = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [isVerified, id]);
    return result.affectedRows > 0;
  },

  async delete(id) {
    const [result] = await db.execute('DELETE FROM tenants WHERE id = ?', [id]);
    return result.affectedRows > 0;
  },

  async comparePassword(plain, hash) {
    return bcrypt.compare(plain, hash);
  }
};

module.exports = Tenant;
