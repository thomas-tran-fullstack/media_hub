// routes/content.js
const express = require('express');
const router = express.Router();
const contentController = require('../controllers/contentController');

// Lấy danh sách content của user
router.get('/contents', contentController.getMyContents);

// Lấy chi tiết content
router.get('/contents/:id', contentController.getContent);

// Tạo content mới
router.post('/contents', contentController.createContent);
// Save livestream session summary
router.post('/contents/session', contentController.saveSession);

// Cập nhật content
router.put('/contents/:id', contentController.updateContent);

// Xóa content
router.delete('/contents/:id', contentController.deleteContent);

module.exports = router;
