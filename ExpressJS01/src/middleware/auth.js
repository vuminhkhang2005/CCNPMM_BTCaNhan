require("dotenv").config();

const jwt = require("jsonwebtoken");
const userRepository = require("../repositories/userRepository");

const auth = async (req, res, next) => {
    const whiteLists = ["/", "/register", "/login", "/forgot-password", "/reset-password"];

    if (whiteLists.find((item) => `/v1/api${item}` === req.originalUrl)) {
        return next();
    }

    const token = req?.headers?.authorization?.split(" ")?.[1];

    if (!token) {
        return res.status(401).json({
            message: "Missing access token in request header, or token is expired",
        });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        let user = null;
        if (!global.dbConnected) {
            user = global.mockUsers?.find((item) => item.email === decoded.email);
        } else {
            user = await userRepository.findByEmail(decoded.email);
        }

        if (!user || user.isActive === false) {
            return res.status(403).json({
                EC: 2,
                EM: "Account is deactivated or no longer exists",
            });
        }

        req.user = {
            email: user.email,
            name: user.name,
            role: user.role,
        };
        return next();
    } catch (error) {
        return res.status(401).json({
            message: "Token is expired or invalid",
        });
    }
};

module.exports = auth;
