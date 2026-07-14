require('dotenv').config();

const db = require('../config/db');

async function run() {
  const [tables] = await db.execute(
    'SHOW TABLES'
  );

  const expected = ['admins', 'tenants', 'rooms', 'bookings'];
  const tableNames = tables.map((row) => Object.values(row)[0]);
  const missing = expected.filter((name) => !tableNames.includes(name));

  const [adminCountRows] = await db.execute('SELECT COUNT(*) AS count FROM admins');
  const [tenantCountRows] = await db.execute('SELECT COUNT(*) AS count FROM tenants');
  const [roomCountRows] = await db.execute('SELECT COUNT(*) AS count FROM rooms');
  const [bookingCountRows] = await db.execute('SELECT COUNT(*) AS count FROM bookings');

  console.log('Database: MySQL (XAMPP)');
  console.log(`Tables found: ${tableNames.length}`);
  console.log(`Admins: ${adminCountRows[0].count}`);
  console.log(`Tenants: ${tenantCountRows[0].count}`);
  console.log(`Rooms: ${roomCountRows[0].count}`);
  console.log(`Bookings: ${bookingCountRows[0].count}`);

  if (missing.length > 0) {
    console.error(`Missing tables: ${missing.join(', ')}`);
    process.exitCode = 1;
    return;
  }

  console.log('Database check passed.');
  process.exitCode = 0;
}

run().catch((error) => {
  console.error('Database check failed.');
  console.error(error.message);
  process.exitCode = 1;
});
