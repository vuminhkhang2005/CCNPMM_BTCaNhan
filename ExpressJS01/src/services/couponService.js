const couponRepository = require("../repositories/couponRepository");
const userRepository = require("../repositories/userRepository");

const POINT_VALUE = 1000;
const REVIEW_REWARD_POINTS = 50;

const defaultCoupons = [
    {
        code: "RUN10",
        title: "10% off running shoes",
        description: "10% discount for orders from 500,000 VND.",
        type: "PERCENT",
        value: 10,
        minOrderAmount: 500000,
        maxDiscount: 150000,
        active: true,
        usageLimit: 0,
        ownerEmail: "",
        source: "PROMOTION",
    },
    {
        code: "SHOE200",
        title: "200K off premium order",
        description: "Save 200,000 VND for orders from 2,000,000 VND.",
        type: "FIXED",
        value: 200000,
        minOrderAmount: 2000000,
        maxDiscount: 200000,
        active: true,
        usageLimit: 0,
        ownerEmail: "",
        source: "PROMOTION",
    },
    {
        code: "FREESHIP",
        title: "Shipping support",
        description: "Save 50,000 VND for orders from 300,000 VND.",
        type: "FIXED",
        value: 50000,
        minOrderAmount: 300000,
        maxDiscount: 50000,
        active: true,
        usageLimit: 0,
        ownerEmail: "",
        source: "PROMOTION",
    },
];

if (!global.mockCoupons) {
    global.mockCoupons = [...defaultCoupons];
}

const normalizeCode = (code = "") => code.toString().trim().toUpperCase();

const serviceResponse = (statusCode, data) => ({ statusCode, data });

const ensureDefaultCoupons = async () => {
    if (!global.dbConnected) return;

    const count = await couponRepository.countAll();
    if (count === 0) {
        await couponRepository.insertMany(defaultCoupons);
    }
};

const isCouponUsable = (coupon, subtotal) => {
    if (!coupon || !coupon.active) return false;
    if (coupon.expiresAt && new Date(coupon.expiresAt) < new Date()) return false;
    if (coupon.usageLimit > 0 && coupon.usedCount >= coupon.usageLimit) return false;
    return Number(subtotal) >= Number(coupon.minOrderAmount || 0);
};

const calculateCouponDiscount = (coupon, subtotal) => {
    if (!isCouponUsable(coupon, subtotal)) return 0;

    const rawDiscount = coupon.type === "PERCENT"
        ? Math.floor(Number(subtotal) * Number(coupon.value) / 100)
        : Number(coupon.value);

    const maxDiscount = Number(coupon.maxDiscount || 0);
    return Math.min(rawDiscount, maxDiscount > 0 ? maxDiscount : rawDiscount, Number(subtotal));
};

const calculatePointsDiscount = ({ pointsAvailable = 0, pointsRequested = 0, subtotal = 0, couponDiscount = 0 }) => {
    const safeRequested = Math.max(Number(pointsRequested) || 0, 0);
    const safeAvailable = Math.max(Number(pointsAvailable) || 0, 0);
    const maxPointsByBalance = Math.min(safeRequested, safeAvailable);
    const maxDiscount = Math.max(Number(subtotal) - Number(couponDiscount), 0);
    const maxPointsByOrder = Math.floor(maxDiscount / POINT_VALUE);
    const pointsUsed = Math.min(maxPointsByBalance, maxPointsByOrder);

    return {
        pointsUsed,
        pointsDiscount: pointsUsed * POINT_VALUE,
    };
};

const getMockUser = (email) => global.mockUsers?.find((user) => user.email === email);

const getWalletService = async (email) => {
    try {
        if (!global.dbConnected) {
            const user = getMockUser(email);
            return serviceResponse(200, {
                EC: 0,
                EM: "Wallet loaded successfully (Memory Fallback)",
                points: Number(user?.points || 0),
                pointValue: POINT_VALUE,
            });
        }

        const user = await userRepository.findByEmail(email);
        if (!user) {
            return serviceResponse(404, { EC: 1, EM: "User not found" });
        }

        return serviceResponse(200, {
            EC: 0,
            EM: "Wallet loaded successfully",
            points: Number(user.points || 0),
            pointValue: POINT_VALUE,
        });
    } catch (error) {
        console.error(">>> Error at getWalletService:", error);
        return serviceResponse(500, { EC: -1, EM: "System error" });
    }
};

const getCouponsService = async (email) => {
    try {
        if (!global.dbConnected) {
            return serviceResponse(200, {
                EC: 0,
                EM: "Coupons loaded successfully (Memory Fallback)",
                coupons: global.mockCoupons.filter((coupon) => !coupon.ownerEmail || coupon.ownerEmail === email),
            });
        }

        await ensureDefaultCoupons();
        const coupons = await couponRepository.findAvailableForEmail(email);
        return serviceResponse(200, {
            EC: 0,
            EM: "Coupons loaded successfully",
            coupons,
        });
    } catch (error) {
        console.error(">>> Error at getCouponsService:", error);
        return serviceResponse(500, { EC: -1, EM: "System error" });
    }
};

const validateCoupon = async ({ email, code, subtotal }) => {
    const normalizedCode = normalizeCode(code);
    if (!normalizedCode) {
        return { EC: 1, EM: "Coupon code is required", discount: 0 };
    }

    if (!global.dbConnected) {
        const coupon = global.mockCoupons.find((item) => item.code === normalizedCode && (!item.ownerEmail || item.ownerEmail === email));
        const discount = calculateCouponDiscount(coupon, subtotal);
        if (!discount) {
            return { EC: 2, EM: "Coupon is invalid or order total is not eligible", discount: 0 };
        }

        return { EC: 0, EM: "Coupon applied", coupon, discount };
    }

    await ensureDefaultCoupons();
    const coupon = await couponRepository.findByCodeForEmail(normalizedCode, email);
    const discount = calculateCouponDiscount(coupon, subtotal);
    if (!discount) {
        return { EC: 2, EM: "Coupon is invalid or order total is not eligible", discount: 0 };
    }

    return { EC: 0, EM: "Coupon applied", coupon, discount };
};

const validateCouponService = async (email, payload = {}) => {
    try {
        const result = await validateCoupon({
            email,
            code: payload.code,
            subtotal: Number(payload.subtotal || 0),
        });

        return serviceResponse(result.EC === 0 ? 200 : 400, result);
    } catch (error) {
        console.error(">>> Error at validateCouponService:", error);
        return serviceResponse(500, { EC: -1, EM: "System error" });
    }
};

const markCouponUsed = async ({ email, code }) => {
    const normalizedCode = normalizeCode(code);
    if (!normalizedCode) return;

    if (!global.dbConnected) {
        const coupon = global.mockCoupons.find((item) => item.code === normalizedCode && (!item.ownerEmail || item.ownerEmail === email));
        if (coupon) {
            coupon.usedCount = Number(coupon.usedCount || 0) + 1;
        }
        return;
    }

    const coupon = await couponRepository.findByCodeForEmail(normalizedCode, email);
    if (coupon) {
        coupon.usedCount = Number(coupon.usedCount || 0) + 1;
        await couponRepository.save(coupon);
    }
};

const createReviewRewardCoupon = async (email) => {
    const suffix = Date.now().toString(36).toUpperCase().slice(-6);
    const coupon = {
        code: `RVW${suffix}`,
        title: "Review reward coupon",
        description: "Thanks for reviewing your purchased product. Save 5% on your next order.",
        type: "PERCENT",
        value: 5,
        minOrderAmount: 300000,
        maxDiscount: 100000,
        active: true,
        usageLimit: 1,
        usedCount: 0,
        ownerEmail: email,
        source: "REVIEW_REWARD",
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    };

    if (!global.dbConnected) {
        global.mockCoupons.push(coupon);
        return coupon;
    }

    return couponRepository.create(coupon);
};

module.exports = {
    POINT_VALUE,
    REVIEW_REWARD_POINTS,
    calculateCouponDiscount,
    calculatePointsDiscount,
    createReviewRewardCoupon,
    getCouponsService,
    getWalletService,
    markCouponUsed,
    validateCoupon,
    validateCouponService,
};
