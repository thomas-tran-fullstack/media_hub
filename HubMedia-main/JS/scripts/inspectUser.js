const db = require('../config/database');

(async () => {
  try {
    const id = process.argv[2] || 8;
    const [rows] = await db.execute('SELECT user_id, username, email, full_name FROM users WHERE user_id = ?', [id]);
    console.log('User:');
    console.table(rows);
    process.exit(0);
  } catch (err) {
    console.error('Error querying users:', err);
    process.exit(1);
  }
})();
