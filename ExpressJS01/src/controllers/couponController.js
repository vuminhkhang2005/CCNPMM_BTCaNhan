const {
    getCouponsService,
    getWalletService,
    validateCouponService,
} = require("../services/couponService");

const sendServiceResponse = (res, result) => res.status(result.statusCode).json(result.data);

const getCoupons = async (req, res) => {
    const result = await getCouponsService(req.user.email);
    return sendServiceResponse(res, result);
};

const validateCoupon = async (req, res) => {
    const result = await validateCouponService(req.user.email, req.body);
    return sendServiceResponse(res, result);
};

const getWallet = async (req, res) => {
    const result = await getWalletService(req.user.email);
    return sendServiceResponse(res, result);
};

module.exports = {
    getCoupons,
    validateCoupon,
    getWallet,
};
