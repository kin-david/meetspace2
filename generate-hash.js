const bcrypt = require('bcryptjs');

const password = 'Test@Password123';
bcrypt.hash(password, 12, (err, hash) => {
  if (err) {
    console.log('Error:', err);
    process.exit(1);
  }
  console.log(hash);
});
