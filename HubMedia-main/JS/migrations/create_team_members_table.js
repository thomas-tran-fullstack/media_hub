const db = require('../config/database');

async function createTeamMembersTable() {
  try {
    console.log('Checking if team_members table exists...');
    
    const query = `
      CREATE TABLE IF NOT EXISTS \`team_members\` (
        \`member_id\` INT AUTO_INCREMENT PRIMARY KEY,
        \`owner_id\` INT NOT NULL,
        \`user_id\` INT NOT NULL,
        \`role\` ENUM('Manager', 'Editor', 'Assistant') DEFAULT 'Assistant',
        \`added_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        \`updated_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (\`owner_id\`) REFERENCES \`users\`(\`user_id\`) ON DELETE CASCADE,
        FOREIGN KEY (\`user_id\`) REFERENCES \`users\`(\`user_id\`) ON DELETE CASCADE,
        UNIQUE KEY \`unique_team_member\` (\`owner_id\`, \`user_id\`),
        INDEX \`idx_owner_id\` (\`owner_id\`),
        INDEX \`idx_user_id\` (\`user_id\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `;
    
    await db.execute(query);
    console.log('✓ team_members table created or already exists');
    
    // Check if last_login column exists in users table
    const checkColumnQuery = `
      SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_NAME='users' AND COLUMN_NAME='last_login'
    `;
    const [rows] = await db.execute(checkColumnQuery);
    
    if (rows.length === 0) {
      console.log('Adding last_login column to users table...');
      const addColumnQuery = `ALTER TABLE \`users\` ADD COLUMN \`last_login\` DATETIME DEFAULT NULL AFTER \`is_active\``;
      await db.execute(addColumnQuery);
      console.log('✓ last_login column added to users table');
    } else {
      console.log('✓ last_login column already exists in users table');
    }
    
  } catch (err) {
    console.error('Error creating team_members table:', err);
  }
}

module.exports = createTeamMembersTable;
