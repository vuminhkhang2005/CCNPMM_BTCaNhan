const userRepository = require("../repositories/userRepository");
const cartRepository = require("../repositories/cartRepository");
const productRepository = require("../repositories/productRepository");
const { findVariant, prepareProductForStorage } = require("../utils/productVariants");

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

const findCartItemIndex = (items, { productId, variantId, color, size }) => items.findIndex((item) => {
    if (variantId && item.variantId) {
        return item.variantId === variantId;
    }

    return item.productId === Number(productId) && item.color === color && item.size === Number(size);
});

const getPositiveQuantity = (quantity) => {
    const parsedQuantity = Number(quantity);
    if (!Number.isInteger(parsedQuantity) || parsedQuantity <= 0) return 0;
    return parsedQuantity;
};

const buildCartItemFromVariant = (product, variant, quantity) => ({
    productId: Number(product.id),
    variantId: variant.variantId,
    sku: variant.sku,
    slug: product.slug,
    name: product.name,
    price: Number(variant.price || product.price),
    color: variant.color,
    size: Number(variant.size),
    quantity,
    image: variant.image || variant.images?.[0] || product.images?.[0],
});

const resolveProductVariant = async ({ productId, slug, variantId, color, size }) => {
    const product = productId
        ? await productRepository.findByIdNumber(productId)
        : await productRepository.findBySlug(slug);

    if (!product) {
        return { error: serviceResponse(404, { EC: 2, EM: "Product not found" }) };
    }

    const productData = prepareProductForStorage(product.toObject());
    const variant = findVariant(productData, { variantId, color, size });

    if (!variant || variant.isActive === false) {
        return { error: serviceResponse(404, { EC: 3, EM: "Product variant not found" }) };
    }

    return { product: productData, variant };
};

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
        const { productId, slug, variantId, color, size, quantity } = productData;
        const qty = getPositiveQuantity(quantity);
        if ((!productId && !slug) || (!variantId && (!color || !size)) || !qty) {
            return serviceResponse(400, { EC: 1, EM: "Missing required product details" });
        }

        if (!global.dbConnected) {
            const cart = getOrCreateMockCart(email);
            const itemIndex = findCartItemIndex(cart.items, { productId, variantId, color, size });

            if (itemIndex > -1) {
                cart.items[itemIndex].quantity += qty;
            } else {
                cart.items.push({
                    productId: Number(productId),
                    variantId: variantId || `${productData.slug}-${color}-${size}`,
                    sku: productData.sku || `${productData.slug}-${color}-${size}`.toUpperCase(),
                    slug,
                    name: productData.name,
                    price: Number(productData.price),
                    color,
                    size: Number(size),
                    quantity: qty,
                    image: productData.image,
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

        const resolved = await resolveProductVariant({ productId, slug, variantId, color, size });
        if (resolved.error) {
            return resolved.error;
        }

        const cart = await cartRepository.findOrCreateByUserId(user._id);
        const itemIndex = findCartItemIndex(cart.items, {
            productId: resolved.product.id,
            variantId: resolved.variant.variantId,
            color: resolved.variant.color,
            size: resolved.variant.size,
        });
        const nextQuantity = itemIndex > -1 ? Number(cart.items[itemIndex].quantity || 0) + qty : qty;

        if (nextQuantity > Number(resolved.variant.stock || 0)) {
            return serviceResponse(409, {
                EC: 4,
                EM: `Only ${resolved.variant.stock} item(s) left for ${resolved.variant.color} size ${resolved.variant.size}`,
            });
        }

        if (itemIndex > -1) {
            cart.items[itemIndex].quantity = nextQuantity;
            cart.items[itemIndex].variantId = resolved.variant.variantId;
            cart.items[itemIndex].price = Number(resolved.variant.price || resolved.product.price);
            cart.items[itemIndex].image = resolved.variant.image || resolved.variant.images?.[0] || resolved.product.images?.[0];
            cart.items[itemIndex].sku = resolved.variant.sku;
            cart.items[itemIndex].color = resolved.variant.color;
            cart.items[itemIndex].size = Number(resolved.variant.size);
        } else {
            cart.items.push(buildCartItemFromVariant(resolved.product, resolved.variant, qty));
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
        const { productId, variantId, color, size, quantity } = itemData;
        if ((!productId && !variantId) || quantity === undefined) {
            return serviceResponse(400, { EC: 1, EM: "Missing parameters" });
        }

        if (!global.dbConnected) {
            const cart = global.mockCarts[email];
            if (!cart) {
                return serviceResponse(404, { EC: 2, EM: "Cart not found (Memory Fallback)" });
            }

            const itemIndex = findCartItemIndex(cart.items, { productId, variantId, color, size });
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

        const itemIndex = findCartItemIndex(cart.items, { productId, variantId, color, size });
        if (itemIndex < 0) {
            return serviceResponse(404, { EC: 3, EM: "Item not found in cart" });
        }

        const qty = Number(quantity);
        if (qty <= 0) {
            cart.items.splice(itemIndex, 1);
        } else {
            const currentItem = cart.items[itemIndex];
            const resolved = await resolveProductVariant({
                productId: currentItem.productId,
                slug: currentItem.slug,
                variantId: currentItem.variantId || variantId,
                color: currentItem.color,
                size: currentItem.size,
            });

            if (resolved.error) {
                return resolved.error;
            }

            if (qty > Number(resolved.variant.stock || 0)) {
                return serviceResponse(409, {
                    EC: 4,
                    EM: `Only ${resolved.variant.stock} item(s) left for ${resolved.variant.color} size ${resolved.variant.size}`,
                });
            }

            cart.items[itemIndex].quantity = qty;
            cart.items[itemIndex].variantId = resolved.variant.variantId;
            cart.items[itemIndex].price = Number(resolved.variant.price || resolved.product.price);
            cart.items[itemIndex].image = resolved.variant.image || resolved.variant.images?.[0] || resolved.product.images?.[0];
            cart.items[itemIndex].sku = resolved.variant.sku;
            cart.items[itemIndex].color = resolved.variant.color;
            cart.items[itemIndex].size = Number(resolved.variant.size);
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
        const { productId, variantId, color, size } = itemData;
        if (!productId && !variantId) {
            return serviceResponse(400, { EC: 1, EM: "Missing parameters" });
        }

        if (!global.dbConnected) {
            const cart = global.mockCarts[email];
            if (!cart) {
                return serviceResponse(404, { EC: 2, EM: "Cart not found (Memory Fallback)" });
            }

            cart.items = cart.items.filter((item) => findCartItemIndex([item], { productId, variantId, color, size }) < 0);

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

        cart.items = cart.items.filter((item) => findCartItemIndex([item], { productId, variantId, color, size }) < 0);

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
