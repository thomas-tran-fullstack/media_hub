const db = require('../config/database');

const migrate = async () => {
  try {
    console.log('[MIGRATION] Ensuring analytics.new_followers column exists...');
    const checkQuery = `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME='analytics' AND TABLE_SCHEMA=DATABASE() AND COLUMN_NAME='new_followers'`;
    const [rows] = await db.execute(checkQuery);
    if (!rows || rows.length === 0) {
      await db.execute("ALTER TABLE `analytics` ADD COLUMN `new_followers` INT DEFAULT 0 AFTER `shares`");
      console.log('[MIGRATION] new_followers column added to analytics');
    } else {
      console.log('[MIGRATION] new_followers column already exists');
    }
  } catch (err) {
    console.error('[MIGRATION ERROR] add_new_followers_to_analytics:', err);
  }
};

module.exports = migrate;
