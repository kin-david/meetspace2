require('dotenv').config();
const bcrypt = require('bcryptjs');
const db = require('../config/db');

async function run() {
  const email = 'admin@meetspace.co.ke';
  const plainPassword = 'Admin@123';
  const hashed = await bcrypt.hash(plainPassword, 12);

  /* Delete all existing admins */
  await db.execute('DELETE FROM admins');

  /* Insert fresh admin */
  await db.execute(
    'INSERT INTO admins (name, email, password) VALUES (?, ?, ?)',
    ['MeetSpace Admin', email, hashed]
  );

  console.log('');
  console.log('=================================');
  console.log('  Admin account reset complete');
  console.log('=================================');
  console.log('  Email:    ' + email);
  console.log('  Password: ' + plainPassword);
  console.log('=================================');
  console.log('');

  process.exitCode = 0;
}

run().catch((error) => {
  console.error('Failed to reset admin account:', error.message);
  process.exitCode = 1;
});
