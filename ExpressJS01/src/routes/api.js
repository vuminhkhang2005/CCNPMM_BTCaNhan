const express = require("express");
const {
    createUser,
    handleLogin,
    getUser,
    getAccount,
    forgotPassword,
    resetPassword,
} = require("../controllers/userController");
const {
    getProducts,
    getProductsByCategory,
    getProductRanking,
    getProductCategories,
    getProductDetail,
} = require("../controllers/productController");
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
    getOrderById,
    cancelOrder,
    updateOrderStatus,
} = require("../controllers/orderController");
const auth = require("../middleware/auth");

const routerAPI = express.Router();

routerAPI.post("/register", createUser);
routerAPI.post("/login", handleLogin);
routerAPI.post("/forgot-password", forgotPassword);
routerAPI.post("/reset-password", resetPassword);

routerAPI.use(auth);

routerAPI.get("/", (req, res) => res.status(200).json("Hello world api"));
routerAPI.get("/user", getUser);
routerAPI.get("/account", getAccount);
routerAPI.get("/products", getProducts);
routerAPI.get("/products/by-category", getProductsByCategory);
routerAPI.get("/products/ranking", getProductRanking);
routerAPI.get("/products/:slug", getProductDetail);
routerAPI.get("/categories", getProductCategories);

// Cart Routes
routerAPI.get("/cart", getCart);
routerAPI.post("/cart/add", addToCart);
routerAPI.put("/cart/item", updateCartItem);
routerAPI.delete("/cart/item", removeFromCart);
routerAPI.delete("/cart", clearCart);

// Order Routes
routerAPI.post("/orders", createOrder);
routerAPI.get("/orders", getOrders);
routerAPI.get("/orders/:id", getOrderById);
routerAPI.post("/orders/:id/cancel", cancelOrder);
routerAPI.put("/orders/:id/status", updateOrderStatus);

module.exports = routerAPI;

