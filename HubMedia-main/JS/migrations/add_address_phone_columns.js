const db = require('../config/database');

const migrate = async () => {
  try {
    console.log('[MIGRATION] Ensuring phone and address columns exist on users table...');

    const checkQuery = `
      SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_NAME = 'users' AND TABLE_SCHEMA = DATABASE() AND COLUMN_NAME IN ('phone','address')
    `;
    const [rows] = await db.execute(checkQuery);
    const existing = rows.map(r => r.COLUMN_NAME);

    if (!existing.includes('phone')) {
      console.log('[MIGRATION] Adding phone column...');
      await db.execute("ALTER TABLE `users` ADD COLUMN `phone` VARCHAR(50) NULL AFTER `username`");
      console.log('[MIGRATION] phone column added');
    } else {
      console.log('[MIGRATION] phone column already exists');
    }

    if (!existing.includes('address')) {
      console.log('[MIGRATION] Adding address column...');
      await db.execute("ALTER TABLE `users` ADD COLUMN `address` VARCHAR(255) NULL AFTER `phone`");
      console.log('[MIGRATION] address column added');
    } else {
      console.log('[MIGRATION] address column already exists');
    }

  } catch (err) {
    console.error('[MIGRATION ERROR] add_address_phone_columns:', err);
  }
};

module.exports = migrate;
