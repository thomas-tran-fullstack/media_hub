const db = require('../config/database');

(async () => {
  try {
    const [rows] = await db.execute('SELECT user_id, username, email FROM users');
    console.log('All users:');
    console.table(rows);
    process.exit(0);
  } catch (err) {
    console.error('Error:', err);
    process.exit(1);
  }
})();
