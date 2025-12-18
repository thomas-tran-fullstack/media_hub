// models/AuthModel.js
const UserModel = require("./UserModel.js");
const bcrypt = require("bcrypt");

const AuthModel = {

    // Xử lý đăng nhập
    login: async (emailOrUsername, password) => {
        const user = await UserModel.findByEmailOrUsername(emailOrUsername);
        if (!user) return { success: false, message: "Email hoặc Username không tồn tại" };

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) return { success: false, message: "Sai mật khẩu" };

        return {
            success: true,
            user: {
                id: user.user_id,
                user_id: user.user_id,
                full_name: user.full_name,
                email: user.email,
                username: user.username
            }
        };
    },

    // Đăng ký
    register: async ({ full_name, email, username, password }) => {
        try {
            const existEmail = await UserModel.findByEmail(email);
            if (existEmail) return { success: false, message: "Email đã tồn tại" };

            const existUsername = await UserModel.findByUsername(username);
            if (existUsername) return { success: false, message: "Username đã tồn tại" };

            const userId = await UserModel.createUser({
                full_name,
                email,
                username,
                password
            });

            return { success: true, userId };
        } catch (error) {
            console.error('Register error:', error);
            return { success: false, message: "Có lỗi xảy ra khi đăng ký. Vui lòng thử lại." };
        }
    }
};

module.exports = AuthModel;
