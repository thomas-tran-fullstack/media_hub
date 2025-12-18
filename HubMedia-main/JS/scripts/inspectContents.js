const db = require('../config/database');

(async () => {
  try {
    const [rows] = await db.execute('SELECT content_id, user_id, title, status, created_at FROM contents ORDER BY created_at DESC LIMIT 20');
    console.log('Recent contents:');
    console.table(rows);
    process.exit(0);
  } catch (err) {
    console.error('Error querying contents:', err);
    process.exit(1);
  }
})();
