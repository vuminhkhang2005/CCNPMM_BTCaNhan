require("dotenv").config();
const User = require("../models/user");
const bcrypt = require('bcrypt');
const jwt = require("jsonwebtoken");
const crypto = require('crypto');
const nodemailer = require('nodemailer');
const saltRounds = 10;

// Biến lưu transporter (tạo 1 lần)
let transporter = null;

// Khởi tạo Email transporter
const initTransporter = async () => {
    if (transporter) return transporter;

    try {
        transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: 'vmkhang2072005@gmail.com',
                pass: 'vkyj upbb wkoz gyui'
            }
        });

        return transporter;
    } catch (error) {
        console.error('Error creating transporter:', error);
        return null;
    }
};

// Hàm gửi email
const sendEmail = async (to, subject, html) => {
    try {
        const transport = await initTransporter();
        if (!transport) {
            return { success: false, error: 'Email service unavailable' };
        }

        const mailOptions = {
            from: '"FullStack App" <vmkhang2072005@gmail.com>',
            to,
            subject,
            html,
        };

        const info = await transport.sendMail(mailOptions);
        
        console.log('\n📨 Email sent: ' + info.response);

        return { success: true, messageId: info.messageId };
    } catch (error) {
        console.error('Error sending email:', error);
        return { success: false, error: error.message };
    }
};

const createUserService = async (name, email, password) => {
    try {
        // 1. Kiểm tra xem user đã tồn tại chưa
        const user = await User.findOne({ email });
        if (user) {
            console.log(`>>> User đã tồn tại, vui lòng chọn email khác: ${email}`);
            return {
                EC: 1,
                EM: "Email này đã được đăng ký, vui lòng chọn email khác"
            };
        }

        // 2. Hash mật khẩu của người dùng
        const hashPassword = await bcrypt.hash(password, saltRounds);

        // 3. Lưu người dùng vào database
        let result = await User.create({
            name: name,
            email: email,
            password: hashPassword,
            role: "USER" // Mặc định gán role là USER
        })
        return {
            EC: 0,
            EM: "Tạo tài khoản thành công",
            user: result
        };

    } catch (error) {
        console.log(">>> Error tại createUserService: ", error);
        return {
            EC: -1,
            EM: "Lỗi hệ thống, vui lòng thử lại"
        };
    }
}

const loginService = async (email, password) => {
    try {
        // 1. Tìm người dùng theo email
        const user = await User.findOne({ email: email });

        if (user) {
            // 2. So sánh mật khẩu (mật khẩu nhập vào vs mật khẩu đã hash trong DB)
            const isMatchPassword = await bcrypt.compare(password, user.password);

            if (!isMatchPassword) {
                return {
                    EC: 2,
                    EM: "Email hoặc Mật khẩu không chính xác"
                };
            } else {
                // 3. Tạo Access Token (JWT)
                const payload = {
                    email: user.email,
                    name: user.name
                };

                const access_token = jwt.sign(
                    payload,
                    process.env.JWT_SECRET,
                    {
                        expiresIn: process.env.JWT_EXPIRE
                    }
                );

                return {
                    EC: 0,
                    access_token,
                    user: {
                        email: user.email,
                        name: user.name
                    }
                };
            }
        } else {
            return {
                EC: 1,
                EM: "Email hoặc Mật khẩu không chính xác"
            };
        }

    } catch (error) {
        console.log(">>> Error tại loginService: ", error);
        return null;
    }
}

const getUserService = async () => {
    try {
        let result = await User.find({}).select("-password"); // Lấy tất cả user nhưng ẩn mật khẩu
        return result;
    } catch (error) {
        console.log(">>> Error tại getUserService: ", error);
        return null;
    }
}

const forgotPasswordService = async (email) => {
    try {
        const user = await User.findOne({ email });

        if (!user) {
            return {
                EC: 1,
                EM: "Email không tồn tại trong hệ thống"
            };
        }

        // Tạo token reset (6 ký tự ngẫu nhiên)
        const resetToken = crypto.randomBytes(3).toString('hex').toUpperCase();
        const resetTokenExpires = new Date(Date.now() + 15 * 60 * 1000); // Hết hạn sau 15 phút

        // Lưu token vào database
        user.passwordResetToken = resetToken;
        user.passwordResetExpires = resetTokenExpires;
        await user.save();

        // Gửi email chứa mã reset
        const subject = "Mã đặt lại mật khẩu - FullStack App";
        const html = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h2 style="color: #333;">Đặt lại mật khẩu</h2>
                <p>Xin chào ${user.name},</p>
                <p>Bạn đã yêu cầu đặt lại mật khẩu cho tài khoản của mình.</p>
                <p>Mã đặt lại mật khẩu của bạn là:</p>
                <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; text-align: center; margin: 20px 0;">
                    <span style="font-size: 24px; font-weight: bold; color: #1890ff;">${resetToken}</span>
                </div>
                <p>Mã này sẽ hết hạn sau 15 phút.</p>
                <p>Nếu bạn không yêu cầu đặt lại mật khẩu, vui lòng bỏ qua email này.</p>
                <br>
                <p>Trân trọng,<br>Đội ngũ FullStack App</p>
            </div>
        `;

        const emailResult = await sendEmail(email, subject, html);

        if (!emailResult.success) {
            console.error('Failed to send email:', emailResult.error);
            return {
                EC: -1,
                EM: "Không thể gửi email, vui lòng thử lại sau"
            };
        }

        console.log("\n=== RESET PASSWORD TOKEN SENT ===");
        console.log(`Email: ${email}`);
        console.log(`Reset Token: ${resetToken}`);
        console.log(`Expires in: 15 minutes`);
        console.log("=================================\n");

        return {
            EC: 0,
            EM: "Mã đặt lại mật khẩu đã được gửi đến email của bạn. Vui lòng kiểm tra hộp thư."
        };
    } catch (error) {
        console.log(">>> Error tại forgotPasswordService: ", error);
        return {
            EC: -1,
            EM: "Lỗi hệ thống"
        };
    }
}

const resetPasswordService = async (email, resetToken, newPassword) => {
    try {
        const user = await User.findOne({ email });

        if (!user) {
            return {
                EC: 1,
                EM: "Email không tồn tại"
            };
        }

        // Kiểm tra token
        if (user.passwordResetToken !== resetToken) {
            return {
                EC: 2,
                EM: "Mã reset không chính xác"
            };
        }

        // Kiểm tra token hết hạn
        if (new Date() > user.passwordResetExpires) {
            return {
                EC: 3,
                EM: "Mã reset đã hết hạn, vui lòng yêu cầu mã mới"
            };
        }

        // Hash mật khẩu mới
        const hashPassword = await bcrypt.hash(newPassword, saltRounds);

        // Cập nhật mật khẩu và xoá token
        user.password = hashPassword;
        user.passwordResetToken = undefined;
        user.passwordResetExpires = undefined;
        await user.save();

        return {
            EC: 0,
            EM: "Đặt lại mật khẩu thành công. Vui lòng đăng nhập lại"
        };
    } catch (error) {
        console.log(">>> Error tại resetPasswordService: ", error);
        return {
            EC: -1,
            EM: "Lỗi hệ thống"
        };
    }
}

module.exports = {
    createUserService,
    loginService,
    getUserService,
    forgotPasswordService,
    resetPasswordService
};