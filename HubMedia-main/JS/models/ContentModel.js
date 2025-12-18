// models/ContentModel.js
const db = require("../config/database");

const ContentModel = {
  // Lấy tất cả content của user hiện tại
  getByUserId: async (user_id, limit = 50) => {
    const [rows] = await db.execute(
      `SELECT * FROM contents WHERE user_id = ? ORDER BY created_at DESC LIMIT ?`,
      [user_id, Number(limit)]
    );
    return rows;
  },

  // Lấy content theo ID
  findById: async (content_id) => {
    const [rows] = await db.execute(
      `SELECT * FROM contents WHERE content_id = ? LIMIT 1`,
      [content_id]
    );
    return rows[0] || null;
  },

  // Get contents by content_type and status (optionally across all users)
  getByTypeAndStatus: async (content_type, status, limit = 50) => {
    const sql = `SELECT * FROM contents WHERE LOWER(content_type) = LOWER(?) AND LOWER(status) = LOWER(?) ORDER BY created_at DESC LIMIT ?`;
    const [rows] = await db.execute(sql, [content_type, status, Number(limit)]);
    return rows;
  },

  // Get contents by user, content_type and status
  getByUserTypeAndStatus: async (user_id, content_type, status, limit = 50) => {
    const sql = `SELECT * FROM contents WHERE user_id = ? AND LOWER(content_type) = LOWER(?) AND LOWER(status) = LOWER(?) ORDER BY created_at DESC LIMIT ?`;
    const [rows] = await db.execute(sql, [user_id, content_type, status, Number(limit)]);
    return rows;
  },

  // Tạo content mới
  create: async (user_id, { title, description, content_type, status = 'draft', thumbnail_url = null, scheduled_at = null, platforms = null }) => {
    const [result] = await db.execute(
      `INSERT INTO contents (user_id, title, description, content_type, status, thumbnail_url, scheduled_at, platforms, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
      [user_id, title, description, content_type, status, thumbnail_url, scheduled_at, platforms]
    );
    return result.insertId;
  },

  // Cập nhật content
  update: async (content_id, data) => {
    const sets = [];
    const params = [];

    // Debug: log incoming payload
    try { console.log('[DEBUG] ContentModel.update payload:', data); } catch (e) {}

    const allowed = ['title', 'description', 'status', 'thumbnail_url', 'scheduled_at', 'content_type', 'platforms', 'revenue'];
    for (const key of allowed) {
      if (data && Object.prototype.hasOwnProperty.call(data, key) && data[key] !== undefined) {
        sets.push(`${key} = ?`);
        params.push(data[key]);
      }
    }

    try { console.log('[DEBUG] ContentModel.update sets:', sets, 'params:', params); } catch (e) {}

    // If nothing to update, consider it a no-op but verify the row exists
    if (sets.length === 0) {
      try {
        const [rows] = await db.execute(`SELECT content_id FROM contents WHERE content_id = ?`, [content_id]);
        return Array.isArray(rows) && rows.length > 0;
      } catch (err) {
        console.error('ContentModel.update existence check error:', err);
        throw err;
      }
    }

    sets.push('updated_at = NOW()');
    params.push(content_id);

    const sql = `UPDATE contents SET ${sets.join(', ')} WHERE content_id = ?`;
    try {
      const [result] = await db.execute(sql, params);
      if (result.affectedRows > 0) return true;
      // If no rows affected, verify the row exists (values may be identical)
      const [rows] = await db.execute(`SELECT content_id FROM contents WHERE content_id = ?`, [content_id]);
      return Array.isArray(rows) && rows.length > 0;
    } catch (err) {
      console.error('ContentModel.update error:', err);
      throw err;
    }
  },

  // Xóa content
  delete: async (content_id) => {
    const [result] = await db.execute(
      `DELETE FROM contents WHERE content_id = ?`,
      [content_id]
    );
    return result.affectedRows > 0;
  }

  // Set views for a content (overwrite with session total)
  , setViews: async (content_id, views) => {
    try {
      const [result] = await db.execute(
        `UPDATE contents SET view_count = ?, updated_at = NOW() WHERE content_id = ?`,
        [Number(views || 0), content_id]
      );
      return result.affectedRows > 0;
    } catch (err) {
      console.error('[ContentModel.setViews] error:', err);
      throw err;
    }
  }
};

module.exports = ContentModel;
