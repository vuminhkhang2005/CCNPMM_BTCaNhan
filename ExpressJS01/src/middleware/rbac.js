const ROLES = Object.freeze({
    ADMIN: "ADMIN",
    USER: "USER",
});

const normalizeAllowedRoles = (roles) => roles.flat().filter(Boolean);

const requireRoles = (...roles) => {
    const allowedRoles = normalizeAllowedRoles(roles);

    return (req, res, next) => {
        const userRole = req.user?.role;

        if (!userRole) {
            return res.status(401).json({
                EC: 1,
                EM: "Authentication is required before checking permissions",
            });
        }

        if (!allowedRoles.includes(userRole)) {
            return res.status(403).json({
                EC: 1,
                EM: "You do not have permission to perform this action",
                requiredRoles: allowedRoles,
            });
        }

        return next();
    };
};

const requireAdmin = requireRoles(ROLES.ADMIN);

module.exports = {
    ROLES,
    requireRoles,
    requireAdmin,
};
