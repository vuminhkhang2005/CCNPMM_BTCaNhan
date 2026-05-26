require("dotenv").config();

const bcrypt = require("bcrypt");
const crypto = require("crypto");
const jwt = require("jsonwebtoken");
const nodemailer = require("nodemailer");
const User = require("../models/user");

const saltRounds = 10;
let transporter = null;

const initTransporter = async () => {
    if (transporter) return transporter;

    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
        return null;
    }

    transporter = nodemailer.createTransport({
        service: "gmail",
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS,
        },
    });

    return transporter;
};

const sendEmail = async (to, subject, html) => {
    try {
        const transport = await initTransporter();
        if (!transport) {
            return { success: false, error: "Email service unavailable" };
        }

        const info = await transport.sendMail({
            from: `"FullStack App" <${process.env.EMAIL_USER}>`,
            to,
            subject,
            html,
        });

        return { success: true, messageId: info.messageId };
    } catch (error) {
        return { success: false, error: error.message };
    }
};

const createUserService = async (name, email, password) => {
    try {
        const user = await User.findOne({ email });
        if (user) {
            return {
                EC: 1,
                EM: "This email is already registered. Please choose another email.",
            };
        }

        const hashPassword = await bcrypt.hash(password, saltRounds);
        const result = await User.create({
            name,
            email,
            password: hashPassword,
            role: "USER",
        });

        return {
            EC: 0,
            EM: "Account created successfully",
            user: result,
        };
    } catch (error) {
        console.log(">>> Error at createUserService: ", error);
        return {
            EC: -1,
            EM: "System error. Please try again.",
        };
    }
};

const loginService = async (email, password) => {
    try {
        const user = await User.findOne({ email });
        if (!user) {
            return { EC: 1, EM: "Email or password is incorrect" };
        }

        const isMatchPassword = await bcrypt.compare(password, user.password);
        if (!isMatchPassword) {
            return { EC: 2, EM: "Email or password is incorrect" };
        }

        const payload = {
            email: user.email,
            name: user.name,
            role: user.role,
        };

        const access_token = jwt.sign(payload, process.env.JWT_SECRET, {
            expiresIn: process.env.JWT_EXPIRE || "1d",
        });

        return {
            EC: 0,
            access_token,
            user: payload,
        };
    } catch (error) {
        console.log(">>> Error at loginService: ", error);
        return {
            EC: -1,
            EM: "System error",
        };
    }
};

const getUserService = async () => {
    try {
        return await User.find({}).select("-password");
    } catch (error) {
        console.log(">>> Error at getUserService: ", error);
        return [];
    }
};

const forgotPasswordService = async (email) => {
    try {
        const user = await User.findOne({ email });
        if (!user) {
            return { EC: 1, EM: "Email does not exist in the system" };
        }

        const resetToken = crypto.randomBytes(3).toString("hex").toUpperCase();
        user.passwordResetToken = resetToken;
        user.passwordResetExpires = new Date(Date.now() + 15 * 60 * 1000);
        await user.save();

        const html = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h2 style="color: #333;">Reset your password</h2>
                <p>Hello ${user.name},</p>
                <p>Your password reset code is:</p>
                <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; text-align: center; margin: 20px 0;">
                    <span style="font-size: 24px; font-weight: bold; color: #1890ff;">${resetToken}</span>
                </div>
                <p>This code will expire in 15 minutes.</p>
            </div>
        `;

        const emailResult = await sendEmail(email, "Password reset code - FullStack App", html);
        if (!emailResult.success) {
            return { EC: -1, EM: "Could not send email. Please try again later." };
        }

        return {
            EC: 0,
            EM: "The password reset code has been sent to your email. Please check your inbox.",
        };
    } catch (error) {
        console.log(">>> Error at forgotPasswordService: ", error);
        return { EC: -1, EM: "System error" };
    }
};

const resetPasswordService = async (email, resetToken, newPassword) => {
    try {
        const user = await User.findOne({ email });
        if (!user) return { EC: 1, EM: "Email does not exist" };
        if (user.passwordResetToken !== resetToken) return { EC: 2, EM: "Reset code is incorrect" };
        if (new Date() > user.passwordResetExpires) {
            return { EC: 3, EM: "Reset code has expired. Please request a new code." };
        }

        user.password = await bcrypt.hash(newPassword, saltRounds);
        user.passwordResetToken = undefined;
        user.passwordResetExpires = undefined;
        await user.save();

        return { EC: 0, EM: "Password reset successfully. Please login again." };
    } catch (error) {
        console.log(">>> Error at resetPasswordService: ", error);
        return { EC: -1, EM: "System error" };
    }
};

module.exports = {
    createUserService,
    loginService,
    getUserService,
    forgotPasswordService,
    resetPasswordService,
};
