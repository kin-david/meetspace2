// models/Room.js
// Database operations for the rooms table

const db = require('../config/db');

const Room = {
  async getAll() {
    const [rows] = await db.execute('SELECT * FROM rooms ORDER BY floor, name');
    return rows;
  },

  async findById(id) {
    const [rows] = await db.execute('SELECT * FROM rooms WHERE id = ?', [id]);
    return rows[0] || null;
  },

  async findByCode(code) {
    const [rows] = await db.execute('SELECT * FROM rooms WHERE room_code = ?', [code]);
    return rows[0] || null;
  },

  async create({ name, capacity, floor, price_per_hour = 50 }) {
    const [countRows] = await db.execute('SELECT COUNT(*) AS cnt FROM rooms');
    const code = 'R' + (countRows[0].cnt + 1);

    const [result] = await db.execute(
      'INSERT INTO rooms (room_code, name, capacity, floor, price_per_hour) VALUES (?, ?, ?, ?, ?)',
      [code, name.trim(), parseInt(capacity), parseInt(floor), parseFloat(price_per_hour)]
    );
    return result.insertId;
  },

  async update(id, { name, capacity, floor, status, price_per_hour }) {
    const [result] = await db.execute(
      'UPDATE rooms SET name = ?, capacity = ?, floor = ?, status = ?, price_per_hour = ? WHERE id = ?',
      [name.trim(), parseInt(capacity), parseInt(floor), status, parseFloat(price_per_hour || 50), id]
    );
    return result.affectedRows > 0;
  },

  async updateStatus(id, status) {
    const [result] = await db.execute('UPDATE rooms SET status = ? WHERE id = ?', [status, id]);
    return result.affectedRows > 0;
  },

  async delete(id) {
    const [result] = await db.execute('DELETE FROM rooms WHERE id = ?', [id]);
    return result.affectedRows > 0;
  },

  async hasConflict(roomId, date, startTime, endTime, excludeBookingId = null) {
    let sql = `
      SELECT id FROM bookings
      WHERE room_id = ?
        AND date = ?
        AND status != 'cancelled'
        AND start_time < ?
        AND end_time   > ?
    `;
    const params = [roomId, date, endTime, startTime];

    if (excludeBookingId) {
      sql += ' AND id != ?';
      params.push(excludeBookingId);
    }

    const [rows] = await db.execute(sql, params);
    return rows.length > 0;
  }
};

module.exports = Room;
