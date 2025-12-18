const express = require('express');
const fs = require('fs');
const path = require('path');
const router = express.Router();

const DATA_DIR = path.join(__dirname, '..', 'data');
const SETTINGS_FILE = path.join(DATA_DIR, 'user_settings.json');
const SUBSCRIPTIONS_FILE = path.join(DATA_DIR, 'subscriptions.json');
const INTEGRATIONS_FILE = path.join(DATA_DIR, 'integrations.json');
const TEAM_FILE = path.join(DATA_DIR, 'team.json');
const PAYMENT_FILE = path.join(DATA_DIR, 'payment_methods.json');
const ContentModel = require('../models/ContentModel');
const TeamModel = require('../models/TeamModel');
const UserModel = require('../models/UserModel');

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
}

function readJsonSafe(filePath) {
  try {
    if (!fs.existsSync(filePath)) return {};
    const raw = fs.readFileSync(filePath, 'utf8');
    return raw ? JSON.parse(raw) : {};
  } catch (e) {
    console.warn('readJsonSafe error', filePath, e);
    return {};
  }
}

function writeJsonSafe(filePath, obj) {
  try {
    fs.writeFileSync(filePath, JSON.stringify(obj, null, 2), 'utf8');
    return true;
  } catch (e) {
    console.error('writeJsonSafe error', filePath, e);
    return false;
  }
}

// Middleware to require session user
function requireAuth(req, res, next) {
  console.log(`[requireAuth] Session:`, req.session ? `ID=${req.session.id}` : 'NO SESSION');
  console.log(`[requireAuth] User:`, req.session?.user ? `ID=${req.session.user.user_id || req.session.user.id}` : 'NO USER');
  
  if (req.session && req.session.user && (req.session.user.user_id || req.session.user.id)) return next();
  return res.status(401).json({ success: false, message: 'Authentication required' });
}

// --- User Settings ---
router.get('/user/settings', requireAuth, (req, res) => {
  ensureDataDir();
  const all = readJsonSafe(SETTINGS_FILE);
  const uid = String(req.session.user.user_id);
  const settings = all[uid] || {};
  return res.json({ success: true, settings });
});

router.post('/user/settings', requireAuth, (req, res) => {
  ensureDataDir();
  const payload = req.body && req.body.settings ? req.body.settings : {};
  const all = readJsonSafe(SETTINGS_FILE);
  const uid = String(req.session.user.user_id);
  all[uid] = Object.assign({}, all[uid] || {}, payload);
  const ok = writeJsonSafe(SETTINGS_FILE, all);
  if (!ok) return res.status(500).json({ success: false, message: 'Could not save settings' });
  return res.json({ success: true, settings: all[uid] });
});

// --- Subscriptions ---
// Prices and metadata for plans
const PLANS = {
  GO: { price: 9.99, title: 'Premium Plan', quotaGB: 256 },
  PLUS: { price: 39.99, title: 'Ultra Plan', quotaGB: 512 },
  PRO: { price: 99.99, title: 'Professional Plan', quotaGB: 1024 }
};

// Expose plans metadata to frontend
router.get('/plans', (req, res) => {
  return res.json({ success: true, plans: PLANS });
});

router.get('/subscriptions', requireAuth, async (req, res) => {
  ensureDataDir();
  const all = readJsonSafe(SUBSCRIPTIONS_FILE);
  const uid = String(req.session.user.user_id);
  const subs = all[uid] || null;

  // compute storage usage from user's contents
  let storageUsageGB = 0;
  try {
    const contents = await ContentModel.getByUserId(uid, 10000);
    // sizes: Post = 0.5 GB, Video = 1 GB, Livestream = 10 GB
    for (const c of contents) {
      const t = (c.content_type || '').toLowerCase();
      if (t === 'post' || t === 'article') storageUsageGB += 0.5;
      else if (t === 'video') storageUsageGB += 1;
      else if (t === 'livestream') storageUsageGB += 10;
    }
  } catch (e) {
    console.warn('[subscriptions] could not compute storage usage', e.message || e);
  }

  return res.json({ success: true, subscription: subs, storageUsageGB });
});

router.post('/subscriptions', requireAuth, (req, res) => {
  ensureDataDir();
  const { plan, months } = req.body || {};
  if (!plan || !PLANS[plan]) return res.status(400).json({ success: false, message: 'Invalid plan' });
  const m = parseInt(months) || 1;
  const pricePerMonth = PLANS[plan].price;
  const amount = parseFloat((pricePerMonth * m).toFixed(2));
  const now = new Date();
  const startDate = now.toISOString();

  const all = readJsonSafe(SUBSCRIPTIONS_FILE);
  const uid = String(req.session.user.user_id);
  const existing = all[uid];
  let expiry;
  if (existing && existing.expiryDate) {
    const currentExpiry = new Date(existing.expiryDate);
    expiry = new Date(Math.max(currentExpiry.getTime(), now.getTime()));
  } else {
    expiry = now;
  }
  // add months
  expiry.setMonth(expiry.getMonth() + m);

  const record = {
    plan,
    planTitle: PLANS[plan].title,
    quotaGB: PLANS[plan].quotaGB,
    amount,
    startDate,
    expiryDate: expiry.toISOString()
  };

  all[uid] = record;
  const ok = writeJsonSafe(SUBSCRIPTIONS_FILE, all);
  if (!ok) return res.status(500).json({ success: false, message: 'Could not save subscription' });
  return res.json({ success: true, subscription: record });
});

// --- Integrations ---
router.get('/integrations', requireAuth, (req, res) => {
  ensureDataDir();
  const all = readJsonSafe(INTEGRATIONS_FILE);
  const uid = String(req.session.user.user_id);
  const ints = all[uid] || {};
  return res.json({ success: true, integrations: ints });
});

router.post('/integrations/connect', requireAuth, (req, res) => {
  ensureDataDir();
  const { platform } = req.body || {};
  if (!platform) return res.status(400).json({ success: false, message: 'Platform required' });
  const all = readJsonSafe(INTEGRATIONS_FILE);
  const uid = String(req.session.user.user_id);
  const userInts = all[uid] || {};
  userInts[platform] = true;
  all[uid] = userInts;
  const ok = writeJsonSafe(INTEGRATIONS_FILE, all);
  if (!ok) return res.status(500).json({ success: false, message: 'Could not save integrations' });
  return res.json({ success: true, integrations: userInts });
});

router.post('/integrations/disconnect', requireAuth, (req, res) => {
  ensureDataDir();
  const { platform } = req.body || {};
  if (!platform) return res.status(400).json({ success: false, message: 'Platform required' });
  const all = readJsonSafe(INTEGRATIONS_FILE);
  const uid = String(req.session.user.user_id);
  const userInts = all[uid] || {};
  delete userInts[platform];
  all[uid] = userInts;
  const ok = writeJsonSafe(INTEGRATIONS_FILE, all);
  if (!ok) return res.status(500).json({ success: false, message: 'Could not save integrations' });
  return res.json({ success: true, integrations: userInts });
});

// --- Team members (database-backed) ---
router.get('/team', requireAuth, async (req, res) => {
  try {
    const uid = req.session.user.user_id;
    const members = await TeamModel.getTeamMembers(uid);
    return res.json({ success: true, members });
  } catch (err) {
    console.error('Error fetching team members:', err);
    return res.status(500).json({ success: false, message: 'Failed to fetch team members' });
  }
});

// Get all users for autocomplete (excluding current user)
router.get('/users/search', requireAuth, async (req, res) => {
  try {
    const { q } = req.query || {};
    const db = require('../config/database');
    const uid = req.session.user.user_id;
    
    let query = `SELECT user_id, full_name, email FROM users WHERE user_id != ? AND is_active = TRUE`;
    const params = [uid];
    
    if (q) {
      query += ` AND (email LIKE ? OR full_name LIKE ?)`;
      const searchTerm = `%${q}%`;
      params.push(searchTerm, searchTerm);
    }
    
    query += ` LIMIT 10`;
    const [rows] = await db.execute(query, params);
    return res.json({ success: true, users: rows || [] });
  } catch (err) {
    console.error('Error searching users:', err);
    return res.status(500).json({ success: false, message: 'Failed to search users' });
  }
});

// Add a team member
router.post('/team/add', requireAuth, async (req, res) => {
  try {
    const { userId, role } = req.body || {};
    const ownerId = req.session.user.user_id;
    
    if (!userId) return res.status(400).json({ success: false, message: 'User ID required' });
    const allowedRoles = ['Manager', 'Editor', 'Assistant'];
    const finalRole = allowedRoles.includes(role) ? role : 'Assistant';
    
    // Check if already a team member
    const isAlready = await TeamModel.isTeamMember(ownerId, userId);
    if (isAlready) {
      return res.status(400).json({ success: false, message: 'User is already a team member' });
    }
    
    const result = await TeamModel.addTeamMember(ownerId, userId, finalRole);
    if (!result.success) {
      return res.status(400).json(result);
    }
    
    // Get the new member details
    const member = await TeamModel.getTeamMember(result.memberId);
    return res.json({ success: true, member });
  } catch (err) {
    console.error('Error adding team member:', err);
    return res.status(500).json({ success: false, message: 'Failed to add team member' });
  }
});

// Update a team member role
router.post('/team/update/:memberId', requireAuth, async (req, res) => {
  try {
    const { memberId } = req.params;
    const { role } = req.body || {};
    const ownerId = req.session.user.user_id;
    
    if (!memberId) return res.status(400).json({ success: false, message: 'Member ID required' });
    if (!role) return res.status(400).json({ success: false, message: 'Role required' });
    
    // Verify ownership
    const member = await TeamModel.getTeamMember(memberId);
    if (!member || member.owner_id !== ownerId) {
      return res.status(403).json({ success: false, message: 'Unauthorized' });
    }
    
    const allowedRoles = ['Manager', 'Editor', 'Assistant'];
    const finalRole = allowedRoles.includes(role) ? role : 'Assistant';
    
    const result = await TeamModel.updateTeamMember(memberId, finalRole);
    if (!result.success) {
      return res.status(400).json(result);
    }
    
    const updatedMember = await TeamModel.getTeamMember(memberId);
    return res.json({ success: true, member: updatedMember });
  } catch (err) {
    console.error('Error updating team member:', err);
    return res.status(500).json({ success: false, message: 'Failed to update team member' });
  }
});

// Delete a team member
router.delete('/team/:memberId', requireAuth, async (req, res) => {
  try {
    const { memberId } = req.params;
    const ownerId = req.session.user.user_id;
    
    if (!memberId) return res.status(400).json({ success: false, message: 'Member ID required' });
    
    // Verify ownership
    const member = await TeamModel.getTeamMember(memberId);
    if (!member || member.owner_id !== ownerId) {
      return res.status(403).json({ success: false, message: 'Unauthorized' });
    }
    
    const result = await TeamModel.deleteTeamMember(memberId);
    if (!result.success) {
      return res.status(400).json(result);
    }
    
    return res.json({ success: true, message: 'Team member removed' });
  } catch (err) {
    console.error('Error deleting team member:', err);
    return res.status(500).json({ success: false, message: 'Failed to delete team member' });
  }
});

// --- Payment Methods ---
router.get('/payment-methods', requireAuth, (req, res) => {
  ensureDataDir();
  const all = readJsonSafe(PAYMENT_FILE);
  const uid = String(req.session.user.user_id);
  const methods = all[uid] || [];
  return res.json({ success: true, methods });
});

router.post('/payment-methods', requireAuth, (req, res) => {
  console.log('[routes] POST /api/payment-methods body:', req.body);
  ensureDataDir();
  const { type, cardNumber, last4, exp, cardholder } = req.body || {};
  // Accept full cardNumber from frontend but never store it; only keep last4
  let computedLast4 = last4;
  if (!computedLast4 && cardNumber) computedLast4 = String(cardNumber).slice(-4);
  if (!type || !computedLast4) return res.status(400).json({ success: false, message: 'Invalid payment method' });
  const all = readJsonSafe(PAYMENT_FILE);
  const uid = String(req.session.user.user_id);
  const methods = all[uid] || [];
  const id = Date.now();
  const newMethod = { id, type, last4: computedLast4, exp: exp || null, cardholder: cardholder || null, active: methods.length === 0 };
  methods.push(newMethod);
  all[uid] = methods;
  const ok = writeJsonSafe(PAYMENT_FILE, all);
  if (!ok) return res.status(500).json({ success: false, message: 'Could not save payment method' });
  return res.json({ success: true, method: newMethod });
});

router.post('/payment-methods/activate', requireAuth, (req, res) => {
  ensureDataDir();
  const { id } = req.body || {};
  if (!id) return res.status(400).json({ success: false, message: 'Method id required' });
  const all = readJsonSafe(PAYMENT_FILE);
  const uid = String(req.session.user.user_id);
  const methods = all[uid] || [];
  let found = false;
  for (const m of methods) {
    if (m.id === id) { m.active = true; found = true; }
    else m.active = false;
  }
  if (!found) return res.status(404).json({ success: false, message: 'Method not found' });
  const ok = writeJsonSafe(PAYMENT_FILE, all);
  if (!ok) return res.status(500).json({ success: false, message: 'Could not update payment methods' });
  return res.json({ success: true, methods: methods });
});

// Delete a payment method
router.delete('/payment-methods/:id', requireAuth, (req, res) => {
  ensureDataDir();
  const id = Number(req.params.id);
  if (!id) return res.status(400).json({ success: false, message: 'Method id required' });
  const all = readJsonSafe(PAYMENT_FILE);
  const uid = String(req.session.user.user_id);
  const methods = all[uid] || [];
  const idx = methods.findIndex(m => m.id === id);
  if (idx === -1) return res.status(404).json({ success: false, message: 'Method not found' });
  const removed = methods.splice(idx, 1)[0];
  // if removed was active, set first remaining as active
  if (removed && removed.active && methods.length > 0) {
    methods[0].active = true;
  }
  all[uid] = methods;
  const ok = writeJsonSafe(PAYMENT_FILE, all);
  if (!ok) return res.status(500).json({ success: false, message: 'Could not delete payment method' });
  return res.json({ success: true, methods });
});

module.exports = router;

