// models/Booking.js
// Database operations for the bookings table

const db = require('../config/db');

const Booking = {
  async getAll(filters = {}) {
    let sql = `
      SELECT
        b.id, b.booking_ref, b.title, b.date,
        b.start_time AS start_time,
        b.end_time   AS end_time,
        b.attendees, b.purpose, b.status, b.created_at,
        b.payment_method, b.payment_contact, b.payment_status,
        t.id   AS tenant_id,   t.name AS tenant_name,
        t.initials AS tenant_initials, t.color AS tenant_color,
        r.id   AS room_id,     r.name AS room_name,
        r.room_code,           r.capacity
      FROM bookings b
      JOIN tenants t ON t.id = b.tenant_id
      JOIN rooms   r ON r.id = b.room_id
    `;
    const params = [];
    const where = [];

    if (filters.status && filters.status !== 'all') {
      where.push('b.status = ?');
      params.push(filters.status);
    }
    if (filters.tenantId) {
      where.push('b.tenant_id = ?');
      params.push(filters.tenantId);
    }
    if (filters.roomId) {
      where.push('b.room_id = ?');
      params.push(filters.roomId);
    }
    if (filters.date) {
      where.push('b.date = ?');
      params.push(filters.date);
    }

    if (where.length) sql += ' WHERE ' + where.join(' AND ');
    sql += ' ORDER BY b.date DESC, b.start_time ASC';

    const [rows] = await db.execute(sql, params);
    return rows;
  },

  async getByTenant(tenantId) {
    const [rows] = await db.execute(`
      SELECT
        b.id, b.booking_ref, b.title, b.date,
        b.start_time AS start_time,
        b.end_time   AS end_time,
        b.attendees, b.purpose, b.status, b.created_at,
        b.payment_method, b.payment_contact, b.payment_status,
        r.id AS room_id, r.name AS room_name, r.room_code, r.capacity, r.floor
      FROM bookings b
      JOIN rooms r ON r.id = b.room_id
      WHERE b.tenant_id = ?
      ORDER BY b.date DESC, b.start_time ASC
    `, [tenantId]);
    return rows;
  },

  async findById(id) {
    const [rows] = await db.execute(`
      SELECT
        b.*,
        b.start_time AS start_time,
        b.end_time   AS end_time,
        t.name AS tenant_name,
        r.name AS room_name, r.room_code
      FROM bookings b
      JOIN tenants t ON t.id = b.tenant_id
      JOIN rooms   r ON r.id = b.room_id
      WHERE b.id = ?
    `, [id]);
    return rows[0] || null;
  },

  async create({ title, tenantId, roomId, date, startTime, endTime, attendees, purpose, paymentMethod, paymentContact, paymentStatus }) {
    const ref = 'BK' + Date.now().toString(36).toUpperCase();
    const [result] = await db.execute(
      `INSERT INTO bookings
        (booking_ref, title, tenant_id, room_id, date, start_time, end_time, attendees, purpose, payment_method, payment_contact, payment_status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)` ,
      [
        ref,
        title.trim(),
        tenantId,
        roomId,
        date,
        startTime,
        endTime,
        parseInt(attendees) || 1,
        purpose || null,
        paymentMethod || null,
        paymentContact || null,
        paymentStatus || 'pending'
      ]
    );
    return result.insertId;
  },

  async update(id, { title, roomId, date, startTime, endTime, attendees, purpose, paymentMethod, paymentContact, paymentStatus }) {
    const [result] = await db.execute(
      `UPDATE bookings
       SET title = ?, room_id = ?, date = ?, start_time = ?, end_time = ?,
           attendees = ?, purpose = ?, payment_method = ?, payment_contact = ?, payment_status = ?
       WHERE id = ?`,
      [
        title.trim(),
        roomId,
        date,
        startTime,
        endTime,
        parseInt(attendees) || 1,
        purpose || null,
        paymentMethod || null,
        paymentContact || null,
        paymentStatus || 'pending',
        id
      ]
    );
    return result.affectedRows > 0;
  },

  async cancel(id) {
    const [result] = await db.execute("UPDATE bookings SET status = 'cancelled' WHERE id = ?", [id]);
    return result.affectedRows > 0;
  },

  async delete(id) {
    const [result] = await db.execute('DELETE FROM bookings WHERE id = ?', [id]);
    return result.affectedRows > 0;
  },

  async getSummary() {
    const [rows] = await db.execute(`
      SELECT
        COUNT(*) AS total,
        SUM(CASE WHEN status = 'upcoming' THEN 1 ELSE 0 END)  AS upcoming,
        SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) AS completed,
        SUM(CASE WHEN status = 'cancelled' THEN 1 ELSE 0 END) AS cancelled,
        SUM(CASE WHEN date = CURDATE() THEN 1 ELSE 0 END) AS today
      FROM bookings
    `);
    return rows[0];
  }
};

module.exports = Booking;
