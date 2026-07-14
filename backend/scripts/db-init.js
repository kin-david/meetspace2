require('dotenv').config();
const db = require('../config/db');

async function run() {
  await db.execute('SELECT 1 AS ok');
  console.log('MySQL database initialized successfully.');
  process.exitCode = 0;
}

run().catch((error) => {
  console.error('Failed to initialize MySQL database.');
  console.error(error.message);
  process.exitCode = 1;
});
