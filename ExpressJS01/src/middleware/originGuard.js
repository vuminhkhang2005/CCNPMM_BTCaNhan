const getAllowedOrigins = () => {
    const configuredOrigins = [
        process.env.CLIENT_URL,
        process.env.FRONTEND_URL,
        process.env.CORS_ORIGIN,
    ]
        .filter(Boolean)
        .flatMap((value) => value.split(","))
        .map((value) => value.trim())
        .filter(Boolean);

    return new Set([
        "http://localhost:5173",
        "http://localhost:5174",
        ...configuredOrigins,
    ]);
};

const requireTrustedOrigin = (req, res, next) => {
    const origin = req.get("origin");
    if (!origin || getAllowedOrigins().has(origin)) {
        return next();
    }

    return res.status(403).json({
        EC: 1,
        EM: "Request origin is not allowed",
    });
};

module.exports = {
    getAllowedOrigins,
    requireTrustedOrigin,
};
