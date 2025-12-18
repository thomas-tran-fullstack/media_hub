// Migration: Add platforms column to contents table
const db = require('../config/database');

const migrate = async () => {
  try {
    console.log('[MIGRATION] Adding platforms column to contents table...');
    await db.execute(`
      ALTER TABLE contents 
      ADD COLUMN IF NOT EXISTS platforms JSON AFTER thumbnail_url
    `);
    console.log('[MIGRATION] Successfully added platforms column');
  } catch (err) {
    if (err.code === 'ER_DUP_FIELDNAME') {
      console.log('[MIGRATION] platforms column already exists');
    } else {
      console.error('[MIGRATION ERROR]', err);
    }
  }
};

module.exports = migrate;
