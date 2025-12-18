const express = require('express');
const router = express.Router();

// Route mặc định chuyển hướng dựa trên trạng thái đăng nhập
router.get('/', (req, res) => {
  // Kiểm tra nếu user đã đăng nhập (có session)
  if (req.session && req.session.user) {
    res.redirect('/index.html');
  } else {
    // Chưa đăng nhập, chuyển tới trang login
    res.redirect('/login.html');
  }
});

module.exports = router;
