// models/ActivityModel.js
const db = require('../config/database');

const ActivityModel = {
  // Log an activity
  log: async (user_id, action, details = null) => {
    const [result] = await db.execute(
      `INSERT INTO user_activities (user_id, action, details) VALUES (?, ?, ?)`,
      [user_id, action, details]
    );
    return result.insertId;
  },

  // Get recent activities for a user
  getRecentByUser: async (user_id, limit = 10) => {
    const [rows] = await db.execute(
      `SELECT activity_id, user_id, action, details, created_at FROM user_activities WHERE user_id = ? ORDER BY created_at DESC LIMIT ?`,
      [user_id, Number(limit)]
    );
    return rows;
  }
};

module.exports = ActivityModel;
