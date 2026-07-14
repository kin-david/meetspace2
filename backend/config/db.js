const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');

let pool = null;
let initialized = false;

function getEnv() {
  const DB_HOST = process.env.DB_HOST || '127.0.0.1';
  const DB_PORT = Number(process.env.DB_PORT || 3306);
  const DB_USER = process.env.DB_USER || 'root';
  const DB_PASSWORD = process.env.DB_PASSWORD || '';
  const DB_NAME = process.env.DB_NAME || 'meetspace_db';
  return { DB_HOST, DB_PORT, DB_USER, DB_PASSWORD, DB_NAME };
}

function assertSafeDbName(dbName) {
  if (!/^[A-Za-z0-9_]+$/.test(dbName)) {
    throw new Error('Invalid DB_NAME. Use only letters, numbers, and underscore.');
  }
}

async function ensureDatabaseExists() {
  const { DB_HOST, DB_PORT, DB_USER, DB_PASSWORD, DB_NAME } = getEnv();
  assertSafeDbName(DB_NAME);

  const conn = await mysql.createConnection({
    host: DB_HOST,
    port: DB_PORT,
    user: DB_USER,
    password: DB_PASSWORD,
    multipleStatements: true
  });

  try {
    await conn.query(`CREATE DATABASE IF NOT EXISTS \`${DB_NAME}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
  } finally {
    await conn.end();
  }
}

async function getDb() {
  if (pool) {
    return pool;
  }

  await ensureDatabaseExists();
  const { DB_HOST, DB_PORT, DB_USER, DB_PASSWORD, DB_NAME } = getEnv();

  pool = mysql.createPool({
    host: DB_HOST,
    port: DB_PORT,
    user: DB_USER,
    password: DB_PASSWORD,
    database: DB_NAME,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    namedPlaceholders: false
  });

  return pool;
}

async function initSchema(db) {
  if (initialized) {
    return;
  }

  await db.execute(`
    CREATE TABLE IF NOT EXISTS admins (
      id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(120) NOT NULL,
      email VARCHAR(191) NOT NULL UNIQUE,
      password VARCHAR(255) NOT NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  await db.execute(`
    CREATE TABLE IF NOT EXISTS tenants (
      id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(120) NOT NULL,
      full_name VARCHAR(120) NOT NULL,
      email VARCHAR(191) NOT NULL UNIQUE,
      phone_number VARCHAR(20) NULL,
      password VARCHAR(255) NOT NULL,
      password_hash VARCHAR(255) NOT NULL,
      initials VARCHAR(8) NULL,
      color VARCHAR(20) NULL,
      profile_picture VARCHAR(255) NULL,
      is_email_verified TINYINT(1) NOT NULL DEFAULT 0,
      email_verification_token VARCHAR(128) NULL,
      email_verification_expires DATETIME NULL,
      reset_token VARCHAR(128) NULL,
      reset_token_expires DATETIME NULL,
      auth_provider ENUM('local') NOT NULL DEFAULT 'local',
      joined_at DATETIME NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_tenants_email (email),
      INDEX idx_tenants_verify_token (email_verification_token),
      INDEX idx_tenants_reset_token (reset_token)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  await db.execute(`
    CREATE TABLE IF NOT EXISTS rooms (
      id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      room_code VARCHAR(20) NOT NULL UNIQUE,
      name VARCHAR(120) NOT NULL,
      capacity INT NOT NULL,
      floor INT NOT NULL,
      status ENUM('available','occupied','reserved','maintenance') NOT NULL DEFAULT 'available',
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  await db.execute(`
    CREATE TABLE IF NOT EXISTS bookings (
      id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      booking_ref VARCHAR(30) NOT NULL UNIQUE,
      title VARCHAR(191) NOT NULL,
      tenant_id BIGINT UNSIGNED NOT NULL,
      room_id BIGINT UNSIGNED NOT NULL,
      date DATE NOT NULL,
      start_time TIME NOT NULL,
      end_time TIME NOT NULL,
      attendees INT NOT NULL DEFAULT 1,
      purpose TEXT NULL,
      status ENUM('upcoming','completed','cancelled') NOT NULL DEFAULT 'upcoming',
      payment_method VARCHAR(40) NULL,
      payment_contact VARCHAR(120) NULL,
      payment_status ENUM('pending','paid','failed','refunded') NOT NULL DEFAULT 'pending',
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_bookings_tenant (tenant_id),
      INDEX idx_bookings_room (room_id),
      INDEX idx_bookings_date (date),
      CONSTRAINT fk_bookings_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
      CONSTRAINT fk_bookings_room FOREIGN KEY (room_id) REFERENCES rooms(id) ON DELETE RESTRICT
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  const [adminRows] = await db.execute('SELECT id FROM admins WHERE email = ? LIMIT 1', ['admin@meetspace.co.ke']);
  if (adminRows.length === 0) {
    const seedPassword = process.env.ADMIN_DEFAULT_PASSWORD || 'Admin@123';
    const hashed = await bcrypt.hash(seedPassword, 10);
    await db.execute(
      'INSERT INTO admins (name, email, password) VALUES (?, ?, ?)',
      ['MeetSpace Admin', 'admin@meetspace.co.ke', hashed]
    );
  }

  const [roomRows] = await db.execute('SELECT COUNT(*) AS count FROM rooms');
  if (Number(roomRows[0].count || 0) === 0) {
    const seedRooms = [
      ['R1', 'Boardroom A', 10, 2, 'available'],
      ['R2', 'Focus Room B', 4, 1, 'available'],
      ['R3', 'Workshop C', 20, 3, 'available'],
      ['R4', 'Pod D', 2, 1, 'available'],
      ['R5', 'Suite E', 8, 2, 'available']
    ];

    for (const room of seedRooms) {
      await db.execute(
        'INSERT INTO rooms (room_code, name, capacity, floor, status) VALUES (?, ?, ?, ?, ?)',
        room
      );
    }
  }

  initialized = true;
}

async function execute(sql, params = []) {
  const db = await getDb();
  await initSchema(db);
  return db.execute(sql, params);
}

async function query(sql, params = []) {
  const [rows] = await execute(sql, params);
  const statement = String(sql || '').trim().toLowerCase();
  if (statement.startsWith('select') || statement.startsWith('show') || statement.startsWith('describe')) {
    return rows;
  }
  return {
    insertId: rows.insertId,
    changes: rows.affectedRows
  };
}

async function testConnection() {
  const db = await getDb();
  await initSchema(db);
  await db.execute('SELECT 1 AS ok');
}

module.exports = {
  query,
  execute,
  testConnection,
  getDb
};
