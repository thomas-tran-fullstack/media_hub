require('dotenv').config();
const mysql = require('mysql2/promise');

async function deleteGuestUser() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'media_hub'
  });

  try {
    // Tìm và xóa Guest User
    const [result] = await connection.execute(
      'DELETE FROM users WHERE username = ? OR full_name = ?',
      ['guest', 'Guest User']
    );

    if (result.affectedRows > 0) {
      console.log(`✅ Đã xóa ${result.affectedRows} Guest User(s)`);
    } else {
      console.log('❌ Không tìm thấy Guest User');
    }

  } catch (err) {
    console.error('❌ Lỗi:', err);
  } finally {
    await connection.end();
  }
}

deleteGuestUser();
