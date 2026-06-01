const userRepository = require("../repositories/userRepository");
const cartRepository = require("../repositories/cartRepository");

if (!global.mockCarts) {
    global.mockCarts = {};
}

const serviceResponse = (statusCode, data) => ({ statusCode, data });

const getOrCreateMockCart = (email) => {
    if (!global.mockCarts[email]) {
        global.mockCarts[email] = { userId: "mock_user_id", items: [] };
    }

    return global.mockCarts[email];
};

const findCartItemIndex = (items, productId, color, size) => items.findIndex(
    (item) => item.productId === Number(productId) && item.color === color && item.size === Number(size),
);

const getCartService = async (email) => {
    try {
        if (!global.dbConnected) {
            return serviceResponse(200, {
                EC: 0,
                EM: "Cart loaded successfully (Memory Fallback)",
                cart: getOrCreateMockCart(email),
            });
        }

        const user = await userRepository.findByEmail(email);
        if (!user) {
            return serviceResponse(404, { EC: 1, EM: "User not found" });
        }

        const cart = await cartRepository.findOrCreateByUserId(user._id);
        return serviceResponse(200, {
            EC: 0,
            EM: "Cart loaded successfully",
            cart,
        });
    } catch (error) {
        console.error(">>> Error at getCartService:", error);
        return serviceResponse(500, { EC: -1, EM: "System error" });
    }
};

const addToCartService = async (email, productData) => {
    try {
        const { productId, slug, name, price, color, size, quantity, image } = productData;
        if (!productId || !slug || !name || !price || !color || !size || !quantity) {
            return serviceResponse(400, { EC: 1, EM: "Missing required product details" });
        }

        if (!global.dbConnected) {
            const cart = getOrCreateMockCart(email);
            const itemIndex = findCartItemIndex(cart.items, productId, color, size);

            if (itemIndex > -1) {
                cart.items[itemIndex].quantity += Number(quantity);
            } else {
                cart.items.push({
                    productId: Number(productId),
                    slug,
                    name,
                    price: Number(price),
                    color,
                    size: Number(size),
                    quantity: Number(quantity),
                    image,
                });
            }

            return serviceResponse(200, {
                EC: 0,
                EM: "Product added to cart successfully (Memory Fallback)",
                cart,
            });
        }

        const user = await userRepository.findByEmail(email);
        if (!user) {
            return serviceResponse(404, { EC: 1, EM: "User not found" });
        }

        const cart = await cartRepository.findOrCreateByUserId(user._id);
        const itemIndex = findCartItemIndex(cart.items, productId, color, size);

        if (itemIndex > -1) {
            cart.items[itemIndex].quantity += Number(quantity);
        } else {
            cart.items.push({
                productId: Number(productId),
                slug,
                name,
                price: Number(price),
                color,
                size: Number(size),
                quantity: Number(quantity),
                image,
            });
        }

        await cartRepository.save(cart);

        return serviceResponse(200, {
            EC: 0,
            EM: "Product added to cart successfully",
            cart,
        });
    } catch (error) {
        console.error(">>> Error at addToCartService:", error);
        return serviceResponse(500, { EC: -1, EM: "System error" });
    }
};

const updateCartItemService = async (email, itemData) => {
    try {
        const { productId, color, size, quantity } = itemData;
        if (!productId || !color || !size || quantity === undefined) {
            return serviceResponse(400, { EC: 1, EM: "Missing parameters" });
        }

        if (!global.dbConnected) {
            const cart = global.mockCarts[email];
            if (!cart) {
                return serviceResponse(404, { EC: 2, EM: "Cart not found (Memory Fallback)" });
            }

            const itemIndex = findCartItemIndex(cart.items, productId, color, size);
            if (itemIndex < 0) {
                return serviceResponse(404, { EC: 3, EM: "Item not found in cart (Memory Fallback)" });
            }

            const qty = Number(quantity);
            if (qty <= 0) {
                cart.items.splice(itemIndex, 1);
            } else {
                cart.items[itemIndex].quantity = qty;
            }

            return serviceResponse(200, {
                EC: 0,
                EM: "Cart updated successfully (Memory Fallback)",
                cart,
            });
        }

        const user = await userRepository.findByEmail(email);
        if (!user) {
            return serviceResponse(404, { EC: 1, EM: "User not found" });
        }

        const cart = await cartRepository.findByUserId(user._id);
        if (!cart) {
            return serviceResponse(404, { EC: 2, EM: "Cart not found" });
        }

        const itemIndex = findCartItemIndex(cart.items, productId, color, size);
        if (itemIndex < 0) {
            return serviceResponse(404, { EC: 3, EM: "Item not found in cart" });
        }

        const qty = Number(quantity);
        if (qty <= 0) {
            cart.items.splice(itemIndex, 1);
        } else {
            cart.items[itemIndex].quantity = qty;
        }

        await cartRepository.save(cart);

        return serviceResponse(200, {
            EC: 0,
            EM: "Cart updated successfully",
            cart,
        });
    } catch (error) {
        console.error(">>> Error at updateCartItemService:", error);
        return serviceResponse(500, { EC: -1, EM: "System error" });
    }
};

const removeFromCartService = async (email, itemData) => {
    try {
        const { productId, color, size } = itemData;
        if (!productId || !color || !size) {
            return serviceResponse(400, { EC: 1, EM: "Missing parameters" });
        }

        if (!global.dbConnected) {
            const cart = global.mockCarts[email];
            if (!cart) {
                return serviceResponse(404, { EC: 2, EM: "Cart not found (Memory Fallback)" });
            }

            cart.items = cart.items.filter(
                (item) => !(item.productId === Number(productId) && item.color === color && item.size === Number(size)),
            );

            return serviceResponse(200, {
                EC: 0,
                EM: "Item removed from cart successfully (Memory Fallback)",
                cart,
            });
        }

        const user = await userRepository.findByEmail(email);
        if (!user) {
            return serviceResponse(404, { EC: 1, EM: "User not found" });
        }

        const cart = await cartRepository.findByUserId(user._id);
        if (!cart) {
            return serviceResponse(404, { EC: 2, EM: "Cart not found" });
        }

        cart.items = cart.items.filter(
            (item) => !(item.productId === Number(productId) && item.color === color && item.size === Number(size)),
        );

        await cartRepository.save(cart);

        return serviceResponse(200, {
            EC: 0,
            EM: "Item removed from cart successfully",
            cart,
        });
    } catch (error) {
        console.error(">>> Error at removeFromCartService:", error);
        return serviceResponse(500, { EC: -1, EM: "System error" });
    }
};

const clearCartService = async (email) => {
    try {
        if (!global.dbConnected) {
            if (global.mockCarts[email]) {
                global.mockCarts[email].items = [];
            }

            return serviceResponse(200, {
                EC: 0,
                EM: "Cart cleared successfully (Memory Fallback)",
                cart: global.mockCarts[email],
            });
        }

        const user = await userRepository.findByEmail(email);
        if (!user) {
            return serviceResponse(404, { EC: 1, EM: "User not found" });
        }

        const cart = await cartRepository.findByUserId(user._id);
        if (cart) {
            cart.items = [];
            await cartRepository.save(cart);
        }

        return serviceResponse(200, {
            EC: 0,
            EM: "Cart cleared successfully",
            cart,
        });
    } catch (error) {
        console.error(">>> Error at clearCartService:", error);
        return serviceResponse(500, { EC: -1, EM: "System error" });
    }
};

module.exports = {
    getCartService,
    addToCartService,
    updateCartItemService,
    removeFromCartService,
    clearCartService,
};
