const {
    getCartService,
    addToCartService,
    updateCartItemService,
    removeFromCartService,
    clearCartService,
} = require("../services/cartService");

const sendServiceResponse = (res, result) => res.status(result.statusCode).json(result.data);

const getCart = async (req, res) => {
    const result = await getCartService(req.user.email);
    return sendServiceResponse(res, result);
};

const addToCart = async (req, res) => {
    const result = await addToCartService(req.user.email, req.body);
    return sendServiceResponse(res, result);
};

const updateCartItem = async (req, res) => {
    const result = await updateCartItemService(req.user.email, req.body);
    return sendServiceResponse(res, result);
};

const removeFromCart = async (req, res) => {
    const result = await removeFromCartService(req.user.email, req.body);
    return sendServiceResponse(res, result);
};

const clearCart = async (req, res) => {
    const result = await clearCartService(req.user.email);
    return sendServiceResponse(res, result);
};

module.exports = {
    getCart,
    addToCart,
    updateCartItem,
    removeFromCart,
    clearCart,
};
