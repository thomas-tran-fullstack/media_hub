// models/UserModel.js
const db = require("../config/database");
const bcrypt = require("bcrypt");

const UserModel = {

    // Lấy user theo email hoặc username (phục vụ login)
    findByEmailOrUsername: async (identifier) => {
        const [rows] = await db.execute(
            "SELECT * FROM users WHERE email = ? OR username = ? LIMIT 1",
            [identifier, identifier]
        );
        return rows[0] || null;
    },

    // Lấy user theo email
    findByEmail: async (email) => {
        const [rows] = await db.execute(
            "SELECT * FROM users WHERE email = ? LIMIT 1",
            [email]
        );
        return rows[0] || null;
    },

    // Lấy user theo username
    findByUsername: async (username) => {
        const [rows] = await db.execute(
            "SELECT * FROM users WHERE username = ? LIMIT 1",
            [username]
        );
        return rows[0] || null;
    },

    // Lấy user theo ID (cho passport deserializer)
    findById: async (id) => {
        const [rows] = await db.execute(
            "SELECT * FROM users WHERE user_id = ? LIMIT 1",
            [id]
        );
        return rows[0] || null;
    },

    // Tạo user mới
    createUser: async ({ full_name, email, username, password, phone = null, avatar_url = null, provider = "none" }) => {
        const hashedPassword = await bcrypt.hash(password, 10);

        const [result] = await db.execute(
            `INSERT INTO users (full_name, email, username, password, phone, avatar_url, social_provider) 
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [full_name, email, username, hashedPassword, phone, avatar_url, provider]
        );

        return result.insertId;
    },

    // Tạo user khi login bằng OAuth
    createOAuthUser: async ({ full_name, email, login_type, avatar_url = null }) => {
        const [result] = await db.execute(
            `
            INSERT INTO users (full_name, email, username, avatar_url, social_provider)
            VALUES (?, ?, ?, ?, ?)
            `,
            [full_name, email, email.split('@')[0], avatar_url, login_type]
        );

        return result.insertId;
    },

    // Cập nhật thông tin user (only safe fields) - build query dynamically to avoid missing-column errors
    updateUser: async (user_id, fields = {}) => {
        // Only allow these safe columns to be updated
        const allowed = ['full_name', 'email', 'username', 'bio', 'avatar_url', 'phone', 'address', 'mini_supermarket'];
        const sets = [];
        const params = [];

        for (const key of allowed) {
            if (fields[key] !== undefined) {
                sets.push(`\`${key}\` = ?`);
                // Convert objects/arrays to JSON string to avoid parameter type issues
                const val = (typeof fields[key] === 'object' && fields[key] !== null) ? JSON.stringify(fields[key]) : fields[key];
                params.push(val);
            }
        }

        if (sets.length === 0) return false;

        const sql = `UPDATE users SET ${sets.join(', ')}, updated_at = NOW() WHERE user_id = ?`;
        params.push(user_id);

        // Debug: log the SQL and params to help diagnose update errors
        try {
            console.log('[UserModel.updateUser] SQL:', sql);
            console.log('[UserModel.updateUser] params:', params);
        } catch (e) {
            // ignore logging errors
        }

        const [result] = await db.execute(sql, params);
        return result.affectedRows > 0;
    },

    // Set avatar URL
    setAvatar: async (user_id, avatar_url) => {
        const [result] = await db.execute(
            `UPDATE users SET avatar_url = ?, updated_at = NOW() WHERE user_id = ?`,
            [avatar_url, user_id]
        );
        return result.affectedRows > 0;
    }
,
    // Update password (hashing inside)
    updatePassword: async (user_id, newPassword) => {
        const hashed = await bcrypt.hash(newPassword, 10);
        const [result] = await db.execute(
            `UPDATE users SET password = ?, updated_at = NOW() WHERE user_id = ?`,
            [hashed, user_id]
        );
        return result.affectedRows > 0;
    }
};

module.exports = UserModel;
