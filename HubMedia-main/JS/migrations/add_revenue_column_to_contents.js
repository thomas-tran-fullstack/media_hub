// Migration: Add revenue column to contents table if it doesn't exist
const db = require('../config/database');

module.exports = async () => {
  try {
    console.log('[MIGRATION] Checking if revenue column exists on contents table...');
    
    // Check if column exists
    const [columns] = await db.execute(`
      SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_NAME='contents' AND COLUMN_NAME='revenue'
    `);
    
    if (columns && columns.length > 0) {
      console.log('[MIGRATION] revenue column already exists');
      return;
    }
    
    // Column doesn't exist, add it
    console.log('[MIGRATION] Adding revenue column to contents table...');
    await db.execute(`
      ALTER TABLE contents ADD COLUMN revenue DECIMAL(12, 2) DEFAULT 0 AFTER share_count
    `);
    
    console.log('[MIGRATION] ✓ Successfully added revenue column');
  } catch (err) {
    if (err.code === 'ER_DUP_FIELDNAME') {
      console.log('[MIGRATION] revenue column already exists (checked via ER_DUP_FIELDNAME)');
    } else {
      console.error('[MIGRATION] Error adding revenue column:', err.message);
      throw err;
    }
  }
};
