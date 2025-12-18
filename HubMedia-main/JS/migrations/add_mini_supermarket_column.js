// Migration: Add mini_supermarket column to users table
const db = require('../config/database');

const migrate = async () => {
  try {
    console.log('[MIGRATION] Adding mini_supermarket column to users table...');
    await db.execute(`
      ALTER TABLE users
      ADD COLUMN IF NOT EXISTS mini_supermarket VARCHAR(255) NULL AFTER full_name
    `);
    console.log('[MIGRATION] Successfully ensured mini_supermarket column');
  } catch (err) {
    if (err && err.code === 'ER_DUP_FIELDNAME') {
      console.log('[MIGRATION] mini_supermarket column already exists');
    } else {
      console.error('[MIGRATION ERROR]', err);
    }
  }
};

module.exports = migrate;
