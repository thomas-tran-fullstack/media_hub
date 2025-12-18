const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');

const profileController = require('../controllers/profileController');

// Multer setup - store uploads in JS/public/uploads
const uploadDir = path.join(__dirname, '..', 'public', 'uploads');
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const unique = Date.now() + '-' + Math.round(Math.random()*1E9);
    const ext = path.extname(file.originalname);
    cb(null, `${unique}${ext}`);
  }
});
const upload = multer({ storage });

// Profile API
router.get('/profile', profileController.getProfile);
router.post('/profile', profileController.updateProfile);
router.post('/profile/avatar', upload.single('avatar'), profileController.uploadAvatar);
router.post('/profile/password', profileController.changePassword);

// Dashboard and activities
router.get('/dashboard/stats', profileController.getStats);
router.get('/dashboard/overview', profileController.getOverview);
router.get('/activities', profileController.getActivities);

module.exports = router;
