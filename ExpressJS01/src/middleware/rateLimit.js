const toPositiveNumber = (value, fallback) => {
    const parsed = Number(value);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

const getClientIp = (req) => {
    const forwardedFor = req.headers["x-forwarded-for"];
    const forwardedIp = Array.isArray(forwardedFor) ? forwardedFor[0] : forwardedFor;

    return (
        req.ip
        || req.socket?.remoteAddress
        || forwardedIp?.split(",")[0]?.trim()
        || "unknown"
    );
};

const normalizeEmail = (req) => String(req.body?.email || "").trim().toLowerCase();

const createRateLimiter = ({
    windowMs = 15 * 60 * 1000,
    max = 100,
    keyPrefix = "rate-limit",
    keyGenerator = getClientIp,
    message = "Too many requests. Please try again later.",
} = {}) => {
    const hits = new Map();
    let lastCleanupAt = Date.now();

    const cleanup = (now) => {
        if (now - lastCleanupAt < windowMs) return;

        for (const [key, entry] of hits.entries()) {
            if (entry.resetAt <= now) {
                hits.delete(key);
            }
        }
        lastCleanupAt = now;
    };

    return (req, res, next) => {
        const now = Date.now();
        cleanup(now);

        const key = `${keyPrefix}:${keyGenerator(req)}`;
        const current = hits.get(key);
        const entry = current && current.resetAt > now
            ? current
            : { count: 0, resetAt: now + windowMs };

        entry.count += 1;
        hits.set(key, entry);

        const remaining = Math.max(max - entry.count, 0);
        const retryAfter = Math.max(Math.ceil((entry.resetAt - now) / 1000), 1);

        res.setHeader("X-RateLimit-Limit", String(max));
        res.setHeader("X-RateLimit-Remaining", String(remaining));
        res.setHeader("X-RateLimit-Reset", String(Math.ceil(entry.resetAt / 1000)));

        if (entry.count > max) {
            res.setHeader("Retry-After", String(retryAfter));
            return res.status(429).json({
                EC: 429,
                EM: message,
                retryAfter,
            });
        }

        return next();
    };
};

const apiRateLimiter = createRateLimiter({
    windowMs: toPositiveNumber(process.env.API_RATE_LIMIT_WINDOW_MS, 15 * 60 * 1000),
    max: toPositiveNumber(process.env.API_RATE_LIMIT_MAX, 300),
    keyPrefix: "api",
    message: "Too many API requests. Please wait a moment and try again.",
});

const authRateLimiter = createRateLimiter({
    windowMs: toPositiveNumber(process.env.AUTH_RATE_LIMIT_WINDOW_MS, 15 * 60 * 1000),
    max: toPositiveNumber(process.env.AUTH_RATE_LIMIT_MAX, 10),
    keyPrefix: "auth",
    keyGenerator: (req) => `${req.path}:${getClientIp(req)}:${normalizeEmail(req) || "anonymous"}`,
    message: "Too many authentication attempts. Please wait a moment and try again.",
});

module.exports = {
    apiRateLimiter,
    authRateLimiter,
    createRateLimiter,
};
