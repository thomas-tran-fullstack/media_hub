const UserModel = require('../models/UserModel');
const ActivityModel = require('../models/ActivityModel');
const path = require('path');

const profileController = {
  // Return current logged-in user's profile (from session)
  getProfile: async (req, res) => {
    try {
      const user = req.session.user;
      if (!user) return res.status(401).json({ success: false, message: 'Unauthorized' });

      const full = await UserModel.findById(user.user_id);
      return res.json({ success: true, profile: full });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ success: false, message: 'Server error' });
    }
  },

  // Update profile fields
  updateProfile: async (req, res) => {
    try {
      const user = req.session.user;
      if (!user) return res.status(401).json({ success: false, message: 'Unauthorized' });

      const { full_name, email, username, phone, address, bio, mini_supermarket } = req.body;

      // Debug logging for troubleshooting server 500
      console.log('updateProfile request body:', req.body);
      const fieldsToUpdate = { full_name, email, username, phone, address, bio, mini_supermarket };
      console.log('updateProfile fields passed to model:', fieldsToUpdate);

      // Pass safe fields including phone/address now that DB has these columns
      let ok = false;
      try {
        ok = await UserModel.updateUser(user.user_id, fieldsToUpdate);
      } catch (dbErr) {
        console.error('[updateProfile] DB update error:', dbErr && dbErr.stack ? dbErr.stack : dbErr);
        console.error('[updateProfile] fields:', fieldsToUpdate);
        // Handle common SQL errors with friendlier messages
        if (dbErr && dbErr.code === 'ER_DUP_ENTRY') {
          return res.status(400).json({ success: false, message: 'Duplicate value - email or username already in use' });
        }
        if (dbErr && (dbErr.code === 'ER_BAD_FIELD_ERROR' || dbErr.code === 'ER_NO_SUCH_TABLE')) {
          return res.status(500).json({ success: false, message: 'Database schema error (missing column/table). Run migrations.' });
        }
        return res.status(500).json({ success: false, message: 'Database update error' });
      }
      if (ok) {
        const updated = await UserModel.findById(user.user_id);
        // Format session user properly
        req.session.user = {
          id: updated.user_id,
          user_id: updated.user_id,
          full_name: updated.full_name,
          email: updated.email,
          username: updated.username
        };
        // Save session to ensure it persists
        req.session.save((err) => {
          if (err) {
            console.error('[updateProfile] Session save error:', err);
          }
        });
        await ActivityModel.log(user.user_id, 'update_profile', JSON.stringify({ full_name, email, username, phone }));
        return res.json({ success: true, profile: updated });
      }

      return res.status(400).json({ success: false, message: 'Update failed' });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ success: false, message: 'Server error' });
    }
  },

  // Upload avatar (expects multer middleware)
  uploadAvatar: async (req, res) => {
    try {
      const user = req.session.user;
      if (!user) return res.status(401).json({ success: false, message: 'Unauthorized' });

      if (!req.file) return res.status(400).json({ success: false, message: 'No file' });

      const filename = path.basename(req.file.path);
      const url = `${req.protocol}://${req.get('host')}/uploads/${filename}`;

      const ok = await UserModel.setAvatar(user.user_id, url);
      if (ok) {
        const updated = await UserModel.findById(user.user_id);
        // Format session user properly
        req.session.user = {
          id: updated.user_id,
          user_id: updated.user_id,
          full_name: updated.full_name,
          email: updated.email,
          username: updated.username
        };
        // Save session to ensure it persists
        req.session.save((err) => {
          if (err) {
            console.error('[uploadAvatar] Session save error:', err);
          }
        });
        await ActivityModel.log(user.user_id, 'update_avatar', url);
        return res.json({ success: true, avatar_url: url, profile: updated });
      }

      return res.status(400).json({ success: false, message: 'Avatar update failed' });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ success: false, message: 'Server error' });
    }
  },

  // Dashboard stats for current user
  getStats: async (req, res) => {
    try {
      const user = req.session.user;
      // TEMP DEBUG: log session and cookies to diagnose why frontend sees total_posts=0
      console.log('[DEBUG] GET /api/dashboard/stats - session user:', user);
      console.log('[DEBUG] GET /api/dashboard/stats - cookies header:', req.headers && req.headers.cookie);
      if (!user) return res.status(401).json({ success: false, message: 'Unauthorized' });

      // Total posts
      const [postsRows] = await require('../config/database').execute(
        'SELECT COUNT(*) AS total_posts FROM contents WHERE user_id = ?',
        [user.user_id]
      );
      console.log('[DEBUG] posts query rows:', postsRows);

      // Profile aggregates from analytics (sessions persisted)
      // Total views across all analytics rows
      const [views] = await require('../config/database').execute(
        'SELECT SUM(views) AS profile_views FROM analytics WHERE user_id = ?',
        [user.user_id]
      );

      // Average views for livestreams: join analytics -> contents where content_type = 'livestream'
      const [avgViewsRows] = await require('../config/database').execute(
        `SELECT AVG(a.views) AS avg_livestream_views FROM analytics a JOIN contents c ON a.content_id = c.content_id WHERE a.user_id = ? AND LOWER(c.content_type) = 'livestream'`,
        [user.user_id]
      );

      // Total revenue from analytics
      const [revRows] = await require('../config/database').execute(
        'SELECT SUM(revenue) AS total_revenue FROM analytics WHERE user_id = ?',
        [user.user_id]
      );

      // Followers: sum of new_followers recorded in analytics (fallback to followers table if present)
      let followersCount = 0;
      try {
        const [f] = await require('../config/database').execute('SELECT SUM(new_followers) AS sum_followers FROM analytics WHERE user_id = ?', [user.user_id]);
        followersCount = (f[0] && f[0].sum_followers) ? Number(f[0].sum_followers) : 0;
      } catch (e) {
        // fallback to followers table if column/table doesn't exist
        try {
          const [f2] = await require('../config/database').execute('SELECT COUNT(*) AS cnt FROM followers WHERE followee_id = ?', [user.user_id]);
          followersCount = f2[0] ? f2[0].cnt : 0;
        } catch (e2) {
          followersCount = 0;
        }
      }

      const totalPostsValue = (postsRows && postsRows[0] && Number(postsRows[0].total_posts)) ? Number(postsRows[0].total_posts) : 0;
      const resultStats = {
        total_posts: totalPostsValue,
        followers: followersCount || 0,
        // Average views for livestreams
        avg_livestream_views: (avgViewsRows && avgViewsRows[0] && Number(avgViewsRows[0].avg_livestream_views)) ? Number(avgViewsRows[0].avg_livestream_views) : 0,
        // Total revenue from analytics
        total_revenue: (revRows && revRows[0] && Number(revRows[0].total_revenue)) ? Number(revRows[0].total_revenue) : 0,
        // Keep raw profile views sum for backward compatibility
        profile_views: (views[0] && views[0].profile_views) || 0
      };
      console.log('[DEBUG] returning stats:', resultStats);
      return res.json({ success: true, stats: resultStats });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ success: false, message: 'Server error' });
    }
  },

  // Dashboard overview for given date range (days)
  getOverview: async (req, res) => {
    try {
      const user = req.session.user;
      if (!user) return res.status(401).json({ success: false, message: 'Unauthorized' });

      const days = Number(req.query.days) || 30;
      const db = require('../config/database');

      const today = new Date();
      // Use local date formatting (YYYY-MM-DD) to avoid UTC offset issues when comparing DATE(created_at)
      const format = (d) => {
        const pad = (n) => String(n).padStart(2, '0');
        return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
      };

      // current period
      let curStart = new Date(today);
      curStart.setDate(today.getDate() - (days - 1));
      const curEnd = new Date(today);

      // previous period immediately before current (same length)
      let prevStart = new Date(today);
      prevStart.setDate(today.getDate() - (2 * days - 1));
      let prevEnd = new Date(today);
      prevEnd.setDate(today.getDate() - days);

      // previous year same range
      const prevYearStart = new Date(curStart);
      prevYearStart.setFullYear(curStart.getFullYear() - 1);
      const prevYearEnd = new Date(curEnd);
      prevYearEnd.setFullYear(curEnd.getFullYear() - 1);

      const curStartStr = format(curStart);
      const curEndStr = format(curEnd);
      const prevStartStr = format(prevStart);
      const prevEndStr = format(prevEnd);
      const prevYearStartStr = format(prevYearStart);
      const prevYearEndStr = format(prevYearEnd);

      // Aggregate current period
      const [curAggRows] = await db.execute(
        `SELECT COALESCE(SUM(new_followers),0) AS new_followers, COALESCE(SUM(revenue),0) AS revenue, COALESCE(SUM(views),0) AS views FROM analytics WHERE user_id = ? AND DATE(date) BETWEEN ? AND ?`,
        [user.user_id, curStartStr, curEndStr]
      );

      // Aggregate previous period
      const [prevAggRows] = await db.execute(
        `SELECT COALESCE(SUM(new_followers),0) AS new_followers, COALESCE(SUM(revenue),0) AS revenue, COALESCE(SUM(views),0) AS views FROM analytics WHERE user_id = ? AND DATE(date) BETWEEN ? AND ?`,
        [user.user_id, prevStartStr, prevEndStr]
      );

      // Aggregate previous year (same date range)
      const [prevYearAggRows] = await db.execute(
        `SELECT COALESCE(SUM(views),0) AS views FROM analytics WHERE user_id = ? AND DATE(date) BETWEEN ? AND ?`,
        [user.user_id, prevYearStartStr, prevYearEndStr]
      );

      // Content published counts current and previous
      const [curContents] = await db.execute(
        `SELECT COUNT(*) AS cnt FROM contents WHERE user_id = ? AND LOWER(status) = 'published' AND DATE(created_at) BETWEEN ? AND ?`,
        [user.user_id, curStartStr, curEndStr]
      );
      const [prevContents] = await db.execute(
        `SELECT COUNT(*) AS cnt FROM contents WHERE user_id = ? AND LOWER(status) = 'published' AND DATE(created_at) BETWEEN ? AND ?`,
        [user.user_id, prevStartStr, prevEndStr]
      );

      // Total posts (all contents) - current and previous period
      const [curTotalPosts] = await db.execute(
        `SELECT COUNT(*) AS cnt FROM contents WHERE user_id = ? AND DATE(created_at) BETWEEN ? AND ?`,
        [user.user_id, curStartStr, curEndStr]
      );
      const [prevTotalPosts] = await db.execute(
        `SELECT COUNT(*) AS cnt FROM contents WHERE user_id = ? AND DATE(created_at) BETWEEN ? AND ?`,
        [user.user_id, prevStartStr, prevEndStr]
      );

      // Total profile views (all time) - for Analytics page to match Profile page
      const [profileViewsAllTime] = await db.execute(
        `SELECT COALESCE(SUM(views),0) AS total_views FROM analytics WHERE user_id = ?`,
        [user.user_id]
      );

      // Profile views in current period and previous period for trend calculation
      const [profileViewsCur] = await db.execute(
        `SELECT COALESCE(SUM(views),0) AS views FROM analytics WHERE user_id = ? AND DATE(date) BETWEEN ? AND ?`,
        [user.user_id, curStartStr, curEndStr]
      );
      const [profileViewsPrev] = await db.execute(
        `SELECT COALESCE(SUM(views),0) AS views FROM analytics WHERE user_id = ? AND DATE(date) BETWEEN ? AND ?`,
        [user.user_id, prevStartStr, prevEndStr]
      );

      const cur = curAggRows[0] || { new_followers:0, revenue:0, views:0 };
      const prev = prevAggRows[0] || { new_followers:0, revenue:0, views:0 };
      const prevYear = prevYearAggRows[0] || { views:0 };

      const contentCur = (curContents[0] && curContents[0].cnt) ? Number(curContents[0].cnt) : 0;
      const contentPrev = (prevContents[0] && prevContents[0].cnt) ? Number(prevContents[0].cnt) : 0;
      const totalPostsCur = (curTotalPosts[0] && curTotalPosts[0].cnt) ? Number(curTotalPosts[0].cnt) : 0;
      const totalPostsPrev = (prevTotalPosts[0] && prevTotalPosts[0].cnt) ? Number(prevTotalPosts[0].cnt) : 0;

      const safePct = (curr, prior) => {
        if (!prior || Number(prior) === 0) return (Number(curr) > 0) ? 100 : 0;
        return ((Number(curr) - Number(prior)) / Math.abs(Number(prior))) * 100;
      };

      const overview = {
        new_followers: Number(cur.new_followers || 0),
        new_followers_prev: Number(prev.new_followers || 0),
        new_followers_pct: Number(safePct(Number(cur.new_followers || 0), Number(prev.new_followers || 0)).toFixed(2)),

        revenue: Number(cur.revenue || 0),
        revenue_prev: Number(prev.revenue || 0),
        revenue_pct: Number(safePct(Number(cur.revenue || 0), Number(prev.revenue || 0)).toFixed(2)),

        content_published: contentCur,
        content_published_prev: contentPrev,
        content_published_pct: Number(safePct(contentCur, contentPrev).toFixed(2)),

        total_posts: totalPostsCur,
        total_posts_prev: totalPostsPrev,
        total_posts_pct: Number(safePct(totalPostsCur, totalPostsPrev).toFixed(2)),

        profile_views: (profileViewsAllTime && profileViewsAllTime[0] && Number(profileViewsAllTime[0].total_views)) ? Number(profileViewsAllTime[0].total_views) : 0,
        profile_views_cur: Number(profileViewsCur[0] && profileViewsCur[0].views || 0),
        profile_views_prev: Number(profileViewsPrev[0] && profileViewsPrev[0].views || 0),
        profile_views_pct: Number(safePct(Number(profileViewsCur[0] && profileViewsCur[0].views || 0), Number(profileViewsPrev[0] && profileViewsPrev[0].views || 0)).toFixed(2)),

        live_views: Number(cur.views || 0),
        live_views_prev_year: Number(prevYear.views || 0),
        live_views_pct_year: Number(safePct(Number(cur.views || 0), Number(prevYear.views || 0)).toFixed(2)),

        days: days
      };
      return res.json({ success: true, overview });
    } catch (err) {
      console.error('[getOverview] error:', err);
      return res.status(500).json({ success: false, message: 'Server error' });
    }
  },

  // Recent activities
  getActivities: async (req, res) => {
    try {
      const user = req.session.user;
      if (!user) return res.status(401).json({ success: false, message: 'Unauthorized' });

      const activities = await ActivityModel.getRecentByUser(user.user_id, 20);
      return res.json({ success: true, activities });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ success: false, message: 'Server error' });
    }
  }
,
  // Change password
  changePassword: async (req, res) => {
    try {
      const user = req.session.user;
      if (!user) return res.status(401).json({ success: false, message: 'Unauthorized' });

      const { currentPassword, newPassword } = req.body;
      if (!currentPassword || !newPassword) return res.status(400).json({ success: false, message: 'Missing fields' });

      const full = await UserModel.findById(user.user_id);
      if (!full) return res.status(404).json({ success: false, message: 'User not found' });

      const bcrypt = require('bcrypt');
      const match = await bcrypt.compare(currentPassword, full.password);
      if (!match) return res.status(400).json({ success: false, message: 'Current password is incorrect' });

      const ok = await UserModel.updatePassword(user.user_id, newPassword);
      if (ok) {
        await ActivityModel.log(user.user_id, 'change_password', null);
        return res.json({ success: true, message: 'Password updated' });
      }

      return res.status(500).json({ success: false, message: 'Could not update password' });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ success: false, message: 'Server error' });
    }
  }
};

module.exports = profileController;
