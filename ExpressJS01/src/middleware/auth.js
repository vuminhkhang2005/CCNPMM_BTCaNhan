require("dotenv").config();

const jwt = require("jsonwebtoken");

const auth = (req, res, next) => {
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
        req.user = {
            email: decoded.email,
            name: decoded.name,
            role: decoded.role,
        };
        return next();
    } catch (error) {
        return res.status(401).json({
            message: "Token is expired or invalid",
        });
    }
};

module.exports = auth;
