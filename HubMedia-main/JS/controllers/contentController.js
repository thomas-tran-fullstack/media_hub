// controllers/contentController.js
const ContentModel = require('../models/ContentModel');

const contentController = {
  // Lấy danh sách content của user hiện tại
  getMyContents: async (req, res) => {
    try {
      const user = req.session.user;
      if (!user) return res.status(401).json({ success: false, message: 'Unauthorized' });

      // If the client provided content_type and status query params, return matching contents
      // but only for the logged-in user (do not expose other users' livestreams).
      const { content_type, status, limit } = req.query;
      if (content_type && status) {
        const contents = await ContentModel.getByUserTypeAndStatus(user.user_id, content_type, status, limit || 100);
        return res.json({ success: true, contents });
      }

      const contents = await ContentModel.getByUserId(user.user_id, 100);
      return res.json({ success: true, contents });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ success: false, message: 'Server error' });
    }
  },

  // Lấy chi tiết một content
  getContent: async (req, res) => {
    try {
      const { id } = req.params;
      const content = await ContentModel.findById(id);
      if (!content) return res.status(404).json({ success: false, message: 'Content not found' });
      return res.json({ success: true, content });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ success: false, message: 'Server error' });
    }
  },

  // Tạo content mới
  createContent: async (req, res) => {
    try {
      const user = req.session.user;
      if (!user) return res.status(401).json({ success: false, message: 'Unauthorized' });

      const { title, description, content_type, status = 'draft', scheduled_at = null, platforms = [] } = req.body;

      if (!title || !content_type) {
        return res.status(400).json({ success: false, message: 'Missing required fields: title, content_type' });
      }

      // Check storage quota before creating content
      try {
        const ContentModelLocal = require('../models/ContentModel');
        const fs = require('fs');
        const path = require('path');
        const DATA_DIR = path.join(__dirname, '..', 'data');
        const SUBSCRIPTIONS_FILE = path.join(DATA_DIR, 'subscriptions.json');
        const readJsonSafe = (p) => { try { if (!fs.existsSync(p)) return {}; const raw = fs.readFileSync(p,'utf8'); return raw?JSON.parse(raw):{} } catch(e){ return {}; } };

        const contents = await ContentModelLocal.getByUserId(user.user_id, 10000);
        let storageUsageGB = 0;
        for (const c of contents) {
          const t = (c.content_type || '').toLowerCase();
          if (t === 'post' || t === 'article') storageUsageGB += 0.5;
          else if (t === 'video') storageUsageGB += 1;
          else if (t === 'livestream') storageUsageGB += 10;
        }

        const subsAll = readJsonSafe(SUBSCRIPTIONS_FILE);
        const sub = subsAll[String(user.user_id)];
        const quotaGB = (sub && sub.quotaGB) ? Number(sub.quotaGB) : 5; // default small quota if none

        // size of new content
        const newSize = (String(content_type).toLowerCase() === 'post' || String(content_type).toLowerCase() === 'article') ? 0.5 : (String(content_type).toLowerCase() === 'video' ? 1 : (String(content_type).toLowerCase() === 'livestream' ? 10 : 0));
        if (storageUsageGB + newSize > quotaGB) {
          return res.status(400).json({ success: false, message: 'Not enough storage quota' });
        }
      } catch (e) {
        console.warn('[createContent] storage check failed', e.message || e);
      }

      // Normalize scheduled_at (convert T to space, add seconds if missing)
      let normalizedScheduled = scheduled_at;
      if (normalizedScheduled) {
        normalizedScheduled = String(normalizedScheduled).replace('T', ' ');
        if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/.test(normalizedScheduled)) normalizedScheduled = normalizedScheduled + ':00';
      }

      const contentId = await ContentModel.create(user.user_id, {
        title,
        description,
        content_type,
        status: (status || 'draft').toLowerCase(),
        scheduled_at: normalizedScheduled,
        platforms: Array.isArray(platforms) ? JSON.stringify(platforms) : null
      });

      if (contentId) {
        const created = await ContentModel.findById(contentId);
        return res.status(201).json({ success: true, content: created });
      }

      return res.status(500).json({ success: false, message: 'Failed to create content' });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ success: false, message: 'Server error' });
    }
  },

  // Save livestream session summary (views, revenue, new followers)
  saveSession: async (req, res) => {
    try {
      const user = req.session.user;
      if (!user) return res.status(401).json({ success: false, message: 'Unauthorized' });

      const { content_id = null, date = null, views = 0, revenue = 0, new_followers = 0 } = req.body;
      
      console.log('[saveSession] Received payload:', { user_id: user.user_id, content_id, date, views, revenue, new_followers });

      // Insert into analytics table as a session summary
      const dt = date ? String(date).split('T')[0] : (new Date()).toISOString().split('T')[0];
      console.log('[saveSession] Inserting analytics row with date:', dt, 'views:', Number(views || 0));
      
      await require('../config/database').execute(
        `INSERT INTO analytics (user_id, content_id, date, views, clicks, likes, comments, shares, revenue, new_followers) VALUES (?, ?, ?, ?, 0, 0, 0, 0, ?, ?)`,
        [user.user_id, content_id, dt, Number(views || 0), Number(revenue || 0), Number(new_followers || 0)]
      );
      console.log('[saveSession] ✓ Analytics row inserted');

      // Also update the content's views and revenue columns so the content table shows the session total
      try {
        if (content_id) {
          const ContentModel = require('../models/ContentModel');
          const db = require('../config/database');
          
          // Get current content data
          console.log('[saveSession] Fetching current content:', content_id);
          const [rows] = await db.execute(
            `SELECT view_count, revenue FROM contents WHERE content_id = ?`,
            [content_id]
          );
          
          if (rows && rows.length > 0) {
            const current = rows[0];
            const newViewCount = Number(current.view_count || 0) + Number(views || 0);
            const newRevenue = Number(current.revenue || 0) + Number(revenue || 0);
            
            console.log('[saveSession] Accumulating - current views:', current.view_count, 'new:', views, 'total:', newViewCount);
            console.log('[saveSession] Accumulating - current revenue:', current.revenue, 'new:', revenue, 'total:', newRevenue);
            
            // Update both view_count and revenue
            await db.execute(
              `UPDATE contents SET view_count = ?, revenue = ?, updated_at = NOW() WHERE content_id = ?`,
              [newViewCount, newRevenue, content_id]
            );
            console.log('[saveSession] ✓ Content views and revenue updated');
          } else {
            console.warn('[saveSession] ⚠ Content not found:', content_id);
          }
        } else {
          console.warn('[saveSession] ⚠ content_id is null, skipping content update');
        }
      } catch (e) {
        console.warn('[saveSession] ✗ Could not update content:', e && e.message ? e.message : e);
      }

      return res.json({ success: true });
    } catch (err) {
      console.error('[saveSession] ✗ error:', err);
      return res.status(500).json({ success: false, message: 'Server error' });
    }
  },

  // Cập nhật content
  updateContent: async (req, res) => {
    try {
      const user = req.session.user;
      if (!user) return res.status(401).json({ success: false, message: 'Unauthorized' });

      const { id } = req.params;
      const { title, description, status, content_type, scheduled_at, platforms = [], revenue } = req.body;

      // Debug logging to diagnose update failures
      console.log('[DEBUG] updateContent request - user:', user);
      console.log('[DEBUG] updateContent request - id:', id);
      console.log('[DEBUG] updateContent request - body:', req.body);

      // Normalize scheduled_at for DB
      let normalizedScheduled = scheduled_at;
      if (normalizedScheduled) {
        normalizedScheduled = String(normalizedScheduled).replace('T', ' ');
        if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/.test(normalizedScheduled)) normalizedScheduled = normalizedScheduled + ':00';
      }

      const updateData = { 
        title, 
        description, 
        status: status?.toLowerCase(), 
        content_type, 
        scheduled_at: normalizedScheduled, 
        platforms: Array.isArray(platforms) ? JSON.stringify(platforms) : null 
      };

      // Add revenue if provided (accumulate with existing)
      if (revenue !== undefined && revenue !== null) {
        updateData.revenue = Number(revenue || 0);
      }

      const ok = await ContentModel.update(id, updateData);
      console.log('[DEBUG] updateContent result OK=', ok);
      if (ok) {
        const updated = await ContentModel.findById(id);
        return res.json({ success: true, content: updated });
      }

      return res.status(400).json({ success: false, message: 'Update failed' });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ success: false, message: 'Server error' });
    }
  },

  // Xóa content
  deleteContent: async (req, res) => {
    try {
      const user = req.session.user;
      if (!user) return res.status(401).json({ success: false, message: 'Unauthorized' });

      const { id } = req.params;

      const ok = await ContentModel.delete(id);
      if (ok) {
        return res.json({ success: true, message: 'Content deleted' });
      }

      return res.status(400).json({ success: false, message: 'Delete failed' });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ success: false, message: 'Server error' });
    }
  }
};

module.exports = contentController;
