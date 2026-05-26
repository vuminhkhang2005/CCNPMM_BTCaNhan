const express = require("express");
const {
    createUser,
    handleLogin,
    getUser,
    getAccount,
    forgotPassword,
    resetPassword,
} = require("../controllers/userController");
const { getProducts, getProductCategories, getProductDetail } = require("../controllers/productController");
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
routerAPI.get("/products/:slug", getProductDetail);
routerAPI.get("/categories", getProductCategories);

module.exports = routerAPI;
