const User = require("../models/user");
const Cart = require("../models/cart");

// Initialize in-memory carts
if (!global.mockCarts) {
    global.mockCarts = {};
}

const getCart = async (req, res) => {
    try {
        const email = req.user.email;

        if (!global.dbConnected) {
            // Memory fallback
            if (!global.mockCarts[email]) {
                global.mockCarts[email] = { userId: "mock_user_id", items: [] };
            }
            return res.status(200).json({
                EC: 0,
                EM: "Cart loaded successfully (Memory Fallback)",
                cart: global.mockCarts[email]
            });
        }

        const user = await User.findOne({ email });
        if (!user) {
            return res.status(404).json({ EC: 1, EM: "User not found" });
        }

        let cart = await Cart.findOne({ userId: user._id });
        if (!cart) {
            cart = await Cart.create({ userId: user._id, items: [] });
        }

        return res.status(200).json({
            EC: 0,
            EM: "Cart loaded successfully",
            cart
        });
    } catch (error) {
        console.error(">>> Error at getCart:", error);
        return res.status(500).json({ EC: -1, EM: "System error" });
    }
};

const addToCart = async (req, res) => {
    try {
        const { productId, slug, name, price, color, size, quantity, image } = req.body;
        if (!productId || !slug || !name || !price || !color || !size || !quantity) {
            return res.status(400).json({ EC: 1, EM: "Missing required product details" });
        }

        const email = req.user.email;

        if (!global.dbConnected) {
            // Memory fallback
            if (!global.mockCarts[email]) {
                global.mockCarts[email] = { userId: "mock_user_id", items: [] };
            }
            const cart = global.mockCarts[email];
            const existingItem = cart.items.find(
                (item) => item.productId === Number(productId) && item.color === color && item.size === Number(size)
            );

            if (existingItem) {
                existingItem.quantity += Number(quantity);
            } else {
                cart.items.push({
                    productId: Number(productId),
                    slug,
                    name,
                    price: Number(price),
                    color,
                    size: Number(size),
                    quantity: Number(quantity),
                    image
                });
            }

            return res.status(200).json({
                EC: 0,
                EM: "Product added to cart successfully (Memory Fallback)",
                cart
            });
        }

        const user = await User.findOne({ email });
        if (!user) {
            return res.status(404).json({ EC: 1, EM: "User not found" });
        }

        let cart = await Cart.findOne({ userId: user._id });
        if (!cart) {
            cart = await Cart.create({ userId: user._id, items: [] });
        }

        const existingItem = cart.items.find(
            (item) => item.productId === Number(productId) && item.color === color && item.size === Number(size)
        );

        if (existingItem) {
            existingItem.quantity += Number(quantity);
        } else {
            cart.items.push({
                productId: Number(productId),
                slug,
                name,
                price: Number(price),
                color,
                size: Number(size),
                quantity: Number(quantity),
                image
            });
        }

        await cart.save();

        return res.status(200).json({
            EC: 0,
            EM: "Product added to cart successfully",
            cart
        });
    } catch (error) {
        console.error(">>> Error at addToCart:", error);
        return res.status(500).json({ EC: -1, EM: "System error" });
    }
};

const updateCartItem = async (req, res) => {
    try {
        const { productId, color, size, quantity } = req.body;
        if (!productId || !color || !size || quantity === undefined) {
            return res.status(400).json({ EC: 1, EM: "Missing parameters" });
        }

        const email = req.user.email;

        if (!global.dbConnected) {
            // Memory fallback
            const cart = global.mockCarts[email];
            if (!cart) {
                return res.status(404).json({ EC: 2, EM: "Cart not found (Memory Fallback)" });
            }

            const itemIndex = cart.items.findIndex(
                (item) => item.productId === Number(productId) && item.color === color && item.size === Number(size)
            );

            if (itemIndex > -1) {
                const qty = Number(quantity);
                if (qty <= 0) {
                    cart.items.splice(itemIndex, 1);
                } else {
                    cart.items[itemIndex].quantity = qty;
                }
            } else {
                return res.status(404).json({ EC: 3, EM: "Item not found in cart (Memory Fallback)" });
            }

            return res.status(200).json({
                EC: 0,
                EM: "Cart updated successfully (Memory Fallback)",
                cart
            });
        }

        const user = await User.findOne({ email });
        if (!user) {
            return res.status(404).json({ EC: 1, EM: "User not found" });
        }

        const cart = await Cart.findOne({ userId: user._id });
        if (!cart) {
            return res.status(404).json({ EC: 2, EM: "Cart not found" });
        }

        const itemIndex = cart.items.findIndex(
            (item) => item.productId === Number(productId) && item.color === color && item.size === Number(size)
        );

        if (itemIndex > -1) {
            const qty = Number(quantity);
            if (qty <= 0) {
                cart.items.splice(itemIndex, 1);
            } else {
                cart.items[itemIndex].quantity = qty;
            }
            await cart.save();
        } else {
            return res.status(404).json({ EC: 3, EM: "Item not found in cart" });
        }

        return res.status(200).json({
            EC: 0,
            EM: "Cart updated successfully",
            cart
        });
    } catch (error) {
        console.error(">>> Error at updateCartItem:", error);
        return res.status(500).json({ EC: -1, EM: "System error" });
    }
};

const removeFromCart = async (req, res) => {
    try {
        const { productId, color, size } = req.body;
        if (!productId || !color || !size) {
            return res.status(400).json({ EC: 1, EM: "Missing parameters" });
        }

        const email = req.user.email;

        if (!global.dbConnected) {
            // Memory fallback
            const cart = global.mockCarts[email];
            if (!cart) {
                return res.status(404).json({ EC: 2, EM: "Cart not found (Memory Fallback)" });
            }

            cart.items = cart.items.filter(
                (item) => !(item.productId === Number(productId) && item.color === color && item.size === Number(size))
            );

            return res.status(200).json({
                EC: 0,
                EM: "Item removed from cart successfully (Memory Fallback)",
                cart
            });
        }

        const user = await User.findOne({ email });
        if (!user) {
            return res.status(404).json({ EC: 1, EM: "User not found" });
        }

        const cart = await Cart.findOne({ userId: user._id });
        if (!cart) {
            return res.status(404).json({ EC: 2, EM: "Cart not found" });
        }

        cart.items = cart.items.filter(
            (item) => !(item.productId === Number(productId) && item.color === color && item.size === Number(size))
        );

        await cart.save();

        return res.status(200).json({
            EC: 0,
            EM: "Item removed from cart successfully",
            cart
        });
    } catch (error) {
        console.error(">>> Error at removeFromCart:", error);
        return res.status(500).json({ EC: -1, EM: "System error" });
    }
};

const clearCart = async (req, res) => {
    try {
        const email = req.user.email;

        if (!global.dbConnected) {
            // Memory fallback
            if (global.mockCarts[email]) {
                global.mockCarts[email].items = [];
            }
            return res.status(200).json({
                EC: 0,
                EM: "Cart cleared successfully (Memory Fallback)",
                cart: global.mockCarts[email]
            });
        }

        const user = await User.findOne({ email });
        if (!user) {
            return res.status(404).json({ EC: 1, EM: "User not found" });
        }

        const cart = await Cart.findOne({ userId: user._id });
        if (cart) {
            cart.items = [];
            await cart.save();
        }

        return res.status(200).json({
            EC: 0,
            EM: "Cart cleared successfully",
            cart
        });
    } catch (error) {
        console.error(">>> Error at clearCart:", error);
        return res.status(500).json({ EC: -1, EM: "System error" });
    }
};

module.exports = {
    getCart,
    addToCart,
    updateCartItem,
    removeFromCart,
    clearCart
};
