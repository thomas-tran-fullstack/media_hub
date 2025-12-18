// controllers/authController.js
const AuthModel = require("../models/AuthModel");
const UserModel = require("../models/UserModel");
const TeamModel = require("../models/TeamModel");

module.exports = {

    getLoginPage: (req, res) => {
        if (req.session.user) return res.redirect('/');
        res.render('login.ejs');
    },

    getRegisterPage: (req, res) => {
        res.render('register.ejs');
    },

    handleLogin: async (req, res) => {
        const { email, password } = req.body; // email hoặc username từ frontend

        if (!email || !password) {
            return res.status(400).json({ success: false, message: "Vui lòng điền đầy đủ thông tin" });
        }

        try {
            const result = await AuthModel.login(email, password);

            if (!result.success) {
                return res.status(400).json(result);
            }

            // Update last_login timestamp
            try {
                await TeamModel.updateLastLogin(result.user.id);
                console.log(`[handleLogin] Updated last_login for user ${result.user.id}`);
            } catch (err) {
                console.warn('[handleLogin] Failed to update last_login:', err);
                // Don't fail login if last_login update fails
            }

            // Lưu session
            req.session.user = result.user;
            console.log(`[handleLogin] User logged in: ID=${result.user.id}, Email=${result.user.email}`);

            // Persist session vào database
            req.session.save((err) => {
                if (err) {
                    console.error('[handleLogin] Session save error:', err);
                    return res.status(500).json({ success: false, message: "Lỗi khi lưu session" });
                }

                console.log(`[handleLogin] Session saved successfully for user ${result.user.id}`);
                return res.json({
                    success: true,
                    message: "Đăng nhập thành công",
                    user: req.session.user
                });
            });

        } catch (err) {
            console.error('[handleLogin] Login error:', err);
            return res.status(500).json({ success: false, message: "Server error" });
        }
    },

    handleRegister: async (req, res) => {
        const { full_name, email, username, password } = req.body;

        if (!full_name || !email || !username || !password) {
            return res.status(400).json({ success: false, message: "Thiếu dữ liệu" });
        }

        try {
            const result = await AuthModel.register({
                full_name,
                email,
                username,
                password
            });

            if (!result.success) {
                return res.status(400).json(result);
            }

            return res.status(201).json({ 
                success: true, 
                message: "Đăng ký thành công" 
            });

        } catch (err) {
            console.error(err);
            return res.status(500).json({ success: false, message: "Server error" });
        }
    },

    logout: (req, res) => {
        req.session.destroy(() => {
            res.clearCookie("session_cookie");
            res.json({ success: true, message: "Đã đăng xuất" });
        });
    },

    me: (req, res) => {
        if (!req.session.user) {
            return res.status(401).json({ success: false, message: "Chưa đăng nhập" });
        }
        res.json({ success: true, user: req.session.user });
    }
};
