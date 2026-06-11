const express = require("express");
const {
    createUser,
    handleLogin,
    getUser,
    getAccount,
    createManagedUser,
    updateUser,
    deactivateUser,
    activateUser,
    updateProfile,
    forgotPassword,
    resetPassword,
    refreshToken,
    logout,
} = require("../controllers/userController");
const {
    getProducts,
    getProductsByCategory,
    getProductRanking,
    getProductCategories,
    getProductDetail,
} = require("../controllers/productController");
const {
    getFavorites,
    getViewedProducts,
    toggleFavorite,
} = require("../controllers/productEngagementController");
const {
    createProductReview,
    getProductReviews,
} = require("../controllers/reviewController");
const {
    getCoupons,
    getWallet,
    validateCoupon,
} = require("../controllers/couponController");
const {
    getCart,
    addToCart,
    updateCartItem,
    removeFromCart,
    clearCart,
} = require("../controllers/cartController");
const {
    createOrder,
    getOrders,
    getAllOrders,
    getOrderById,
    cancelOrder,
    requestReturnOrder,
    receiveOrder,
    updateOrderStatus,
} = require("../controllers/orderController");
const auth = require("../middleware/auth");
const { requireAdmin } = require("../middleware/rbac");
const { authRateLimiter } = require("../middleware/rateLimit");
const { requireTrustedOrigin } = require("../middleware/originGuard");

const routerAPI = express.Router();

routerAPI.post("/register", authRateLimiter, createUser);
routerAPI.post("/login", authRateLimiter, requireTrustedOrigin, handleLogin);
routerAPI.post("/refresh-token", requireTrustedOrigin, refreshToken);
routerAPI.post("/logout", requireTrustedOrigin, logout);
routerAPI.post("/forgot-password", authRateLimiter, forgotPassword);
routerAPI.post("/reset-password", authRateLimiter, resetPassword);

routerAPI.use(auth);

routerAPI.get("/", (req, res) => res.status(200).json("Hello world api"));
routerAPI.get("/user", requireAdmin, getUser);
routerAPI.get("/account", getAccount);
routerAPI.patch("/profile", updateProfile);
routerAPI.get("/admin/users", requireAdmin, getUser);
routerAPI.post("/admin/users", requireAdmin, createManagedUser);
routerAPI.put("/admin/users/:id", requireAdmin, updateUser);
routerAPI.patch("/admin/users/:id/deactivate", requireAdmin, deactivateUser);
routerAPI.patch("/admin/users/:id/activate", requireAdmin, activateUser);
routerAPI.get("/products", getProducts);
routerAPI.get("/products/by-category", getProductsByCategory);
routerAPI.get("/products/ranking", getProductRanking);
routerAPI.get("/products/:slug/reviews", getProductReviews);
routerAPI.post("/products/:slug/reviews", createProductReview);
routerAPI.post("/products/:slug/favorite", toggleFavorite);
routerAPI.get("/products/:slug", getProductDetail);
routerAPI.get("/categories", getProductCategories);
routerAPI.get("/favorites", getFavorites);
routerAPI.get("/viewed-products", getViewedProducts);
routerAPI.get("/coupons", getCoupons);
routerAPI.post("/coupons/validate", validateCoupon);
routerAPI.get("/wallet", getWallet);

// Cart Routes
routerAPI.get("/cart", getCart);
routerAPI.post("/cart/add", addToCart);
routerAPI.put("/cart/item", updateCartItem);
routerAPI.delete("/cart/item", removeFromCart);
routerAPI.delete("/cart", clearCart);

// Order Routes
routerAPI.post("/orders", createOrder);
routerAPI.get("/admin/orders", requireAdmin, getAllOrders);
routerAPI.get("/orders", getOrders);
routerAPI.get("/orders/:id", getOrderById);
routerAPI.post("/orders/:id/cancel", cancelOrder);
routerAPI.post("/orders/:id/return", requestReturnOrder);
routerAPI.post("/orders/:id/receive", receiveOrder);
routerAPI.put("/orders/:id/status", requireAdmin, updateOrderStatus);

module.exports = routerAPI;

