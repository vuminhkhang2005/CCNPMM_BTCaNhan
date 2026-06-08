require("dotenv").config();

const bcrypt = require("bcrypt");
const crypto = require("crypto");
const jwt = require("jsonwebtoken");
const nodemailer = require("nodemailer");
const userRepository = require("../repositories/userRepository");

const saltRounds = 10;
let transporter = null;

const USER_ROLES = Object.freeze(["USER", "ADMIN"]);

const generateMockId = () => Array.from(
    { length: 24 },
    () => Math.floor(Math.random() * 16).toString(16),
).join("");

const sanitizeUser = (user) => {
    if (!user) return null;
    const source = typeof user.toObject === "function" ? user.toObject() : user;

    return {
        _id: source._id,
        name: source.name,
        email: source.email,
        role: source.role || "USER",
        phone: source.phone || "",
        address: source.address || "",
        isActive: source.isActive !== false,
        points: Number(source.points || 0),
        createdAt: source.createdAt,
        updatedAt: source.updatedAt,
    };
};

const buildAuthPayload = (user) => ({
    email: user.email,
    name: user.name,
    role: user.role || "USER",
});

const signAccessToken = (user) => jwt.sign(buildAuthPayload(user), process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE || "2h",
});

const normalizeRole = (role) => (USER_ROLES.includes(role) ? role : "USER");

// Initialize mock user store for memory fallback
if (!global.mockUsers) {
    global.mockUsers = [
        {
            _id: generateMockId(),
            name: "Admin Manager",
            email: "admin@rungear.com",
            password: bcrypt.hashSync("adminpassword", saltRounds),
            role: "ADMIN",
            phone: "",
            address: "",
            isActive: true,
            points: 0,
            favoriteProducts: [],
            viewedProducts: [],
        },
        {
            _id: generateMockId(),
            name: "Regular Member",
            email: "user@rungear.com",
            password: bcrypt.hashSync("userpassword", saltRounds),
            role: "USER",
            phone: "",
            address: "",
            isActive: true,
            points: 0,
            favoriteProducts: [],
            viewedProducts: [],
        }
    ];
}

const initTransporter = async () => {
    if (transporter) return transporter;

    if (process.env.EMAIL_SERVICE === "ethereal") {
        const testAccount = await nodemailer.createTestAccount();
        transporter = nodemailer.createTransport({
            host: "smtp.ethereal.email",
            port: 587,
            secure: false,
            auth: {
                user: testAccount.user,
                pass: testAccount.pass,
            },
        });
        return transporter;
    }

    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
        return null;
    }

    transporter = nodemailer.createTransport({
        service: process.env.EMAIL_SERVICE || "gmail",
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
            from: `"FullStack App" <${process.env.EMAIL_USER || "no-reply@fullstackapp.local"}>`,
            to,
            subject,
            html,
        });

        const previewUrl = nodemailer.getTestMessageUrl(info);
        if (previewUrl) {
            console.log(">>> Ethereal preview URL:", previewUrl);
        }

        return { success: true, messageId: info.messageId, previewUrl };
    } catch (error) {
        return { success: false, error: error.message };
    }
};

const createUserService = async (name, email, password) => {
    try {
        if (!global.dbConnected) {
            // Memory fallback
            const user = global.mockUsers.find((u) => u.email === email);
            if (user) {
                return {
                    EC: 1,
                    EM: "This email is already registered. Please choose another email. (Memory Fallback)",
                };
            }
            const hashPassword = await bcrypt.hash(password, saltRounds);
            const newUser = {
                _id: generateMockId(),
                name,
                email,
                password: hashPassword,
                role: "USER",
                phone: "",
                address: "",
                isActive: true,
                points: 0,
                favoriteProducts: [],
                viewedProducts: [],
            };
            global.mockUsers.push(newUser);
            return {
                EC: 0,
                EM: "Account created successfully (Memory Fallback)",
                user: sanitizeUser(newUser),
            };
        }

        // DB implementation
        const user = await userRepository.findByEmail(email);
        if (user) {
            return {
                EC: 1,
                EM: "This email is already registered. Please choose another email.",
            };
        }

        const hashPassword = await bcrypt.hash(password, saltRounds);
        const result = await userRepository.create({
            name,
            email,
            password: hashPassword,
            role: "USER",
            phone: "",
            address: "",
            isActive: true,
            points: 0,
            favoriteProducts: [],
            viewedProducts: [],
        });

        return {
            EC: 0,
            EM: "Account created successfully",
            user: sanitizeUser(result),
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
        if (!global.dbConnected) {
            // Memory fallback
            const user = global.mockUsers.find((u) => u.email === email);
            if (!user) {
                return { EC: 1, EM: "Email or password is incorrect (Memory Fallback)" };
            }
            if (user.isActive === false) {
                return { EC: 3, EM: "This account has been deactivated. Please contact an administrator. (Memory Fallback)" };
            }
            const isMatchPassword = await bcrypt.compare(password, user.password);
            if (!isMatchPassword) {
                return { EC: 2, EM: "Email or password is incorrect (Memory Fallback)" };
            }
            const payload = buildAuthPayload(user);
            const access_token = signAccessToken(user);
            return {
                EC: 0,
                access_token,
                user: payload,
            };
        }

        // DB implementation
        const user = await userRepository.findByEmail(email);
        if (!user) {
            return { EC: 1, EM: "Email or password is incorrect" };
        }

        if (user.isActive === false) {
            return { EC: 3, EM: "This account has been deactivated. Please contact an administrator." };
        }

        const isMatchPassword = await bcrypt.compare(password, user.password);
        if (!isMatchPassword) {
            return { EC: 2, EM: "Email or password is incorrect" };
        }

        const payload = buildAuthPayload(user);
        const access_token = signAccessToken(user);

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
        if (!global.dbConnected) {
            // Memory fallback
            return global.mockUsers.map(sanitizeUser);
        }
        const users = await userRepository.findAllWithoutPassword();
        return users.map(sanitizeUser);
    } catch (error) {
        console.log(">>> Error at getUserService: ", error);
        return [];
    }
};

const getAccountService = async (email) => {
    try {
        if (!global.dbConnected) {
            const user = global.mockUsers.find((item) => item.email === email);
            if (!user) return { EC: 1, EM: "Account not found (Memory Fallback)" };
            if (user.isActive === false) return { EC: 2, EM: "Account is deactivated (Memory Fallback)" };
            return { EC: 0, user: sanitizeUser(user) };
        }

        const user = await userRepository.findByEmail(email);
        if (!user) return { EC: 1, EM: "Account not found" };
        if (user.isActive === false) return { EC: 2, EM: "Account is deactivated" };
        return { EC: 0, user: sanitizeUser(user) };
    } catch (error) {
        console.log(">>> Error at getAccountService: ", error);
        return { EC: -1, EM: "System error" };
    }
};

const createManagedUserService = async (payload = {}) => {
    try {
        const name = String(payload.name || "").trim();
        const email = String(payload.email || "").trim().toLowerCase();
        const password = String(payload.password || "");
        const role = normalizeRole(payload.role);

        if (!name || !email || !password) {
            return { EC: 1, EM: "Name, email and password are required" };
        }

        if (!global.dbConnected) {
            const existing = global.mockUsers.find((user) => user.email === email);
            if (existing) return { EC: 2, EM: "Email already exists (Memory Fallback)" };

            const newUser = {
                _id: generateMockId(),
                name,
                email,
                password: await bcrypt.hash(password, saltRounds),
                role,
                phone: String(payload.phone || "").trim(),
                address: String(payload.address || "").trim(),
                isActive: payload.isActive !== false,
                points: 0,
                favoriteProducts: [],
                viewedProducts: [],
                createdAt: new Date(),
                updatedAt: new Date(),
            };
            global.mockUsers.push(newUser);
            return { EC: 0, EM: "User created successfully (Memory Fallback)", user: sanitizeUser(newUser) };
        }

        const existing = await userRepository.findByEmail(email);
        if (existing) return { EC: 2, EM: "Email already exists" };

        const user = await userRepository.create({
            name,
            email,
            password: await bcrypt.hash(password, saltRounds),
            role,
            phone: String(payload.phone || "").trim(),
            address: String(payload.address || "").trim(),
            isActive: payload.isActive !== false,
            points: 0,
            favoriteProducts: [],
            viewedProducts: [],
        });

        return { EC: 0, EM: "User created successfully", user: sanitizeUser(user) };
    } catch (error) {
        console.log(">>> Error at createManagedUserService: ", error);
        return { EC: -1, EM: "System error" };
    }
};

const updateUserService = async (id, payload = {}, actorEmail = "") => {
    try {
        const name = String(payload.name || "").trim();
        const email = String(payload.email || "").trim().toLowerCase();
        const role = normalizeRole(payload.role);
        const phone = String(payload.phone || "").trim();
        const address = String(payload.address || "").trim();

        if (!name || !email) {
            return { EC: 1, EM: "Name and email are required" };
        }

        if (!global.dbConnected) {
            const user = global.mockUsers.find((item) => item._id === id);
            if (!user) return { EC: 2, EM: "User not found (Memory Fallback)" };
            const duplicated = global.mockUsers.find((item) => item.email === email && item._id !== id);
            if (duplicated) return { EC: 3, EM: "Email already exists (Memory Fallback)" };
            if (user.email === actorEmail && (email !== user.email || role !== user.role)) {
                return { EC: 5, EM: "Use the profile page to update your own email. You cannot change your own role. (Memory Fallback)" };
            }

            user.name = name;
            user.email = email;
            user.role = role;
            user.phone = phone;
            user.address = address;
            if (typeof payload.isActive === "boolean") {
                if (user.email === actorEmail && payload.isActive === false) {
                    return { EC: 4, EM: "You cannot deactivate your own account (Memory Fallback)" };
                }
                user.isActive = payload.isActive;
            }
            if (payload.password) {
                user.password = await bcrypt.hash(String(payload.password), saltRounds);
            }
            user.updatedAt = new Date();

            return { EC: 0, EM: "User updated successfully (Memory Fallback)", user: sanitizeUser(user) };
        }

        const user = await userRepository.findById(id);
        if (!user) return { EC: 2, EM: "User not found" };
        const duplicated = await userRepository.findByEmail(email);
        if (duplicated && duplicated._id.toString() !== user._id.toString()) {
            return { EC: 3, EM: "Email already exists" };
        }
        if (user.email === actorEmail && (email !== user.email || role !== user.role)) {
            return { EC: 5, EM: "Use the profile page to update your own email. You cannot change your own role." };
        }

        if (typeof payload.isActive === "boolean") {
            if (user.email === actorEmail && payload.isActive === false) {
                return { EC: 4, EM: "You cannot deactivate your own account" };
            }
            user.isActive = payload.isActive;
        }
        user.name = name;
        user.email = email;
        user.role = role;
        user.phone = phone;
        user.address = address;
        if (payload.password) {
            user.password = await bcrypt.hash(String(payload.password), saltRounds);
        }

        await userRepository.save(user);

        return { EC: 0, EM: "User updated successfully", user: sanitizeUser(user) };
    } catch (error) {
        console.log(">>> Error at updateUserService: ", error);
        return { EC: -1, EM: "System error" };
    }
};

const setUserActiveService = async (id, isActive, actorEmail = "") => {
    try {
        if (!global.dbConnected) {
            const user = global.mockUsers.find((item) => item._id === id);
            if (!user) return { EC: 2, EM: "User not found (Memory Fallback)" };
            if (user.email === actorEmail && !isActive) {
                return { EC: 4, EM: "You cannot deactivate your own account (Memory Fallback)" };
            }
            user.isActive = Boolean(isActive);
            user.updatedAt = new Date();
            return {
                EC: 0,
                EM: isActive ? "User activated successfully (Memory Fallback)" : "User deactivated successfully (Memory Fallback)",
                user: sanitizeUser(user),
            };
        }

        const user = await userRepository.findById(id);
        if (!user) return { EC: 2, EM: "User not found" };
        if (user.email === actorEmail && !isActive) {
            return { EC: 4, EM: "You cannot deactivate your own account" };
        }
        user.isActive = Boolean(isActive);
        await userRepository.save(user);

        return {
            EC: 0,
            EM: isActive ? "User activated successfully" : "User deactivated successfully",
            user: sanitizeUser(user),
        };
    } catch (error) {
        console.log(">>> Error at setUserActiveService: ", error);
        return { EC: -1, EM: "System error" };
    }
};

const updateProfileService = async (email, payload = {}) => {
    try {
        const name = String(payload.name || "").trim();
        const nextEmail = String(payload.email || "").trim().toLowerCase();
        const phone = String(payload.phone || "").trim();
        const address = String(payload.address || "").trim();

        if (!name || !nextEmail) {
            return { EC: 1, EM: "Name and email are required" };
        }

        if (!global.dbConnected) {
            const user = global.mockUsers.find((item) => item.email === email);
            if (!user) return { EC: 2, EM: "Account not found (Memory Fallback)" };
            if (user.isActive === false) return { EC: 3, EM: "Account is deactivated (Memory Fallback)" };
            const duplicated = global.mockUsers.find((item) => item.email === nextEmail && item._id !== user._id);
            if (duplicated) return { EC: 4, EM: "Email already exists (Memory Fallback)" };

            if (payload.newPassword) {
                if (!payload.currentPassword) {
                    return { EC: 5, EM: "Current password is required to change password (Memory Fallback)" };
                }
                const isMatchPassword = await bcrypt.compare(String(payload.currentPassword), user.password);
                if (!isMatchPassword) {
                    return { EC: 6, EM: "Current password is incorrect (Memory Fallback)" };
                }
                user.password = await bcrypt.hash(String(payload.newPassword), saltRounds);
            }

            user.name = name;
            user.email = nextEmail;
            user.phone = phone;
            user.address = address;
            user.updatedAt = new Date();

            return {
                EC: 0,
                EM: "Profile updated successfully (Memory Fallback)",
                user: sanitizeUser(user),
                access_token: signAccessToken(user),
            };
        }

        const user = await userRepository.findByEmail(email);
        if (!user) return { EC: 2, EM: "Account not found" };
        if (user.isActive === false) return { EC: 3, EM: "Account is deactivated" };
        const duplicated = await userRepository.findByEmail(nextEmail);
        if (duplicated && duplicated._id.toString() !== user._id.toString()) {
            return { EC: 4, EM: "Email already exists" };
        }

        if (payload.newPassword) {
            if (!payload.currentPassword) {
                return { EC: 5, EM: "Current password is required to change password" };
            }
            const isMatchPassword = await bcrypt.compare(String(payload.currentPassword), user.password);
            if (!isMatchPassword) {
                return { EC: 6, EM: "Current password is incorrect" };
            }
            user.password = await bcrypt.hash(String(payload.newPassword), saltRounds);
        }

        user.name = name;
        user.email = nextEmail;
        user.phone = phone;
        user.address = address;
        await userRepository.save(user);

        return {
            EC: 0,
            EM: "Profile updated successfully",
            user: sanitizeUser(user),
            access_token: signAccessToken(user),
        };
    } catch (error) {
        console.log(">>> Error at updateProfileService: ", error);
        return { EC: -1, EM: "System error" };
    }
};

const forgotPasswordService = async (email) => {
    try {
        if (!global.dbConnected) {
            const user = global.mockUsers.find((u) => u.email === email);
            if (!user) {
                return { EC: 1, EM: "Email does not exist in the system (Memory Fallback)" };
            }
            const resetToken = crypto.randomBytes(3).toString("hex").toUpperCase();
            user.passwordResetToken = resetToken;
            user.passwordResetExpires = new Date(Date.now() + 15 * 60 * 1000);
            
            console.log(`[MOCK EMAIL RESET CODE]: User ${user.email} -> Reset Code: ${resetToken}`);
            
            return {
                EC: 0,
                EM: `(Mock Mode) Password reset code printed to server log: ${resetToken}`,
            };
        }

        // DB implementation
        const user = await userRepository.findByEmail(email);
        if (!user) {
            return { EC: 1, EM: "Email does not exist in the system" };
        }

        const resetToken = crypto.randomBytes(3).toString("hex").toUpperCase();
        user.passwordResetToken = resetToken;
        user.passwordResetExpires = new Date(Date.now() + 15 * 60 * 1000);
        await userRepository.save(user);

        const html = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h2 style="color: #333;">Reset your password</h2>
                <p>Hello ${user.name},</p>
                <p>Your password reset code is:</p>
                <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; text-align: center; margin: 20px 0;">
                    <span style="font-size: 24px; font-weight: bold; color: #1890ff;">${resetToken}</span>
                </div>
                <p>This code will expire in 15 minutes.</p>
                <p style="font-size: 0.9rem; color: #777;">If you did not request this, please ignore this email.</p>
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
        if (!global.dbConnected) {
            const user = global.mockUsers.find((u) => u.email === email);
            if (!user) return { EC: 1, EM: "Email does not exist (Memory Fallback)" };
            if (user.passwordResetToken !== resetToken) return { EC: 2, EM: "Reset code is incorrect (Memory Fallback)" };
            if (new Date() > user.passwordResetExpires) {
                return { EC: 3, EM: "Reset code has expired. (Memory Fallback)" };
            }
            user.password = await bcrypt.hash(newPassword, saltRounds);
            user.passwordResetToken = undefined;
            user.passwordResetExpires = undefined;
            return { EC: 0, EM: "Password reset successfully. Please login again. (Memory Fallback)" };
        }

        // DB implementation
        const user = await userRepository.findByEmail(email);
        if (!user) return { EC: 1, EM: "Email does not exist" };
        if (user.passwordResetToken !== resetToken) return { EC: 2, EM: "Reset code is incorrect" };
        if (new Date() > user.passwordResetExpires) {
            return { EC: 3, EM: "Reset code has expired. Please request a new code." };
        }

        user.password = await bcrypt.hash(newPassword, saltRounds);
        user.passwordResetToken = undefined;
        user.passwordResetExpires = undefined;
        await userRepository.save(user);

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
    getAccountService,
    createManagedUserService,
    updateUserService,
    setUserActiveService,
    updateProfileService,
    forgotPasswordService,
    resetPasswordService,
};
