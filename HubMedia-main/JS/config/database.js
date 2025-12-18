require('dotenv').config();
const mysql = require('mysql2/promise');

// Create connection pool with environment variables
const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'media_hub',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

// Test connection
pool.getConnection()
    .then((conn) => {
        console.log('Connected to MySQL');
        conn.release();
    })
    .catch((err) => {
        console.error('Database connection failed:', err);
    });

module.exports = pool;
