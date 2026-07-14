// models/Admin.js
// Database operations for the admins table

const db = require('../config/db');
const bcrypt = require('bcryptjs');

const Admin = {
  async findByEmail(email) {
    const [rows] = await db.execute('SELECT * FROM admins WHERE email = ?', [email]);
    return rows[0] || null;
  },

  async findById(id) {
    const [rows] = await db.execute('SELECT id, name, email, created_at FROM admins WHERE id = ?', [id]);
    return rows[0] || null;
  },

  async comparePassword(plain, hash) {
    return bcrypt.compare(plain, hash);
  }
};

module.exports = Admin;
