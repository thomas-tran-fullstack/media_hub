// Migration: Add views column to contents table if it doesn't exist
const db = require('../config/database');

module.exports = async () => {
  try {
    console.log('[MIGRATION] Checking if views column exists on contents table...');
    
    // Check if column exists
    const [columns] = await db.execute(`
      SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_NAME='contents' AND COLUMN_NAME='views'
    `);
    
    if (columns && columns.length > 0) {
      console.log('[MIGRATION] views column already exists');
      return;
    }
    
    // Column doesn't exist, add it
    console.log('[MIGRATION] Adding views column to contents table...');
    await db.execute(`
      ALTER TABLE contents ADD COLUMN views INT DEFAULT 0 AFTER view_count
    `);
    
    console.log('[MIGRATION] ✓ Successfully added views column');
  } catch (err) {
    if (err.code === 'ER_DUP_FIELDNAME') {
      console.log('[MIGRATION] views column already exists (checked via ER_DUP_FIELDNAME)');
    } else {
      console.error('[MIGRATION] Error adding views column:', err.message);
    }
  }
};
