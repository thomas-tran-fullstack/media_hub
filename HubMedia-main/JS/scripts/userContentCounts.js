const db = require('../config/database');

(async () => {
  try {
    const [rows] = await db.execute(`
      SELECT u.user_id, u.username, u.email, COUNT(c.content_id) AS total_posts
      FROM users u
      LEFT JOIN contents c ON u.user_id = c.user_id
      GROUP BY u.user_id
      ORDER BY total_posts DESC
    `);

    console.log('User content counts:');
    console.table(rows);
    process.exit(0);
  } catch (err) {
    console.error('Error querying counts:', err);
    process.exit(1);
  }
})();
