const categoryRepository = require("../repositories/categoryRepository");
const productRepository = require("../repositories/productRepository");
const userRepository = require("../repositories/userRepository");

if (!global.mockProductSnapshots) {
    global.mockProductSnapshots = {};
}

const serviceResponse = (statusCode, data) => ({ statusCode, data });

const rememberProductSnapshot = (product) => {
    if (!product?.id) return;
    global.mockProductSnapshots[Number(product.id)] = product;
};

const mapProductsWithCategories = async (products = []) => {
    const categories = await categoryRepository.findAll();
    return products.map((product) => {
        const plainProduct = product.toObject ? product.toObject() : product;
        const categoryInfo = categories.find((category) => category.id === plainProduct.category);
        return { ...plainProduct, categoryInfo };
    });
};

const recordViewedProduct = async (email, product) => {
    if (!email || !product) return;

    if (!global.dbConnected) {
        rememberProductSnapshot(product);
        const user = global.mockUsers?.find((item) => item.email === email);
        if (!user) return;

        const current = (user.viewedProducts || []).filter((item) => Number(item.productId) !== Number(product.id));
        user.viewedProducts = [
            { productId: Number(product.id), slug: product.slug, viewedAt: new Date() },
            ...current,
        ].slice(0, 12);
        return;
    }

    const user = await userRepository.findByEmail(email);
    if (!user) return;

    const current = (user.viewedProducts || []).filter((item) => Number(item.productId) !== Number(product.id));
    user.viewedProducts = [
        { productId: Number(product.id), slug: product.slug, viewedAt: new Date() },
        ...current,
    ].slice(0, 12);
    await userRepository.save(user);
};

const toggleFavoriteService = async (email, slug, payload = {}) => {
    try {
        if (!global.dbConnected) {
            const user = global.mockUsers?.find((item) => item.email === email);
            if (!user) {
                return serviceResponse(404, { EC: 1, EM: "User not found (Memory Fallback)" });
            }

            const productId = Number(payload.productId);
            if (!productId) {
                return serviceResponse(400, { EC: 2, EM: "Product id is required in memory fallback" });
            }

            rememberProductSnapshot(payload.product);
            const favorites = new Set((user.favoriteProducts || []).map(Number));
            const isFavorite = favorites.has(productId);
            if (isFavorite) {
                favorites.delete(productId);
            } else {
                favorites.add(productId);
            }
            user.favoriteProducts = Array.from(favorites);

            return serviceResponse(200, {
                EC: 0,
                EM: isFavorite ? "Product removed from favorites (Memory Fallback)" : "Product added to favorites (Memory Fallback)",
                isFavorite: !isFavorite,
                favoriteProducts: user.favoriteProducts,
            });
        }

        const [user, product] = await Promise.all([
            userRepository.findByEmail(email),
            productRepository.findBySlug(slug),
        ]);

        if (!user) {
            return serviceResponse(404, { EC: 1, EM: "User not found" });
        }
        if (!product) {
            return serviceResponse(404, { EC: 2, EM: "Product not found" });
        }

        const favorites = new Set((user.favoriteProducts || []).map(Number));
        const isFavorite = favorites.has(product.id);
        if (isFavorite) {
            favorites.delete(product.id);
        } else {
            favorites.add(product.id);
        }
        user.favoriteProducts = Array.from(favorites);
        await userRepository.save(user);

        return serviceResponse(200, {
            EC: 0,
            EM: isFavorite ? "Product removed from favorites" : "Product added to favorites",
            isFavorite: !isFavorite,
            favoriteProducts: user.favoriteProducts,
        });
    } catch (error) {
        console.error(">>> Error at toggleFavoriteService:", error);
        return serviceResponse(500, { EC: -1, EM: "System error" });
    }
};

const getFavoriteProductsService = async (email) => {
    try {
        if (!global.dbConnected) {
            const user = global.mockUsers?.find((item) => item.email === email);
            const products = (user?.favoriteProducts || [])
                .map((productId) => global.mockProductSnapshots[Number(productId)])
                .filter(Boolean);
            return serviceResponse(200, {
                EC: 0,
                EM: "Favorite products loaded successfully (Memory Fallback)",
                products,
            });
        }

        const user = await userRepository.findByEmail(email);
        if (!user) {
            return serviceResponse(404, { EC: 1, EM: "User not found" });
        }

        const products = await productRepository.findByIds(user.favoriteProducts || []);
        return serviceResponse(200, {
            EC: 0,
            EM: "Favorite products loaded successfully",
            products: await mapProductsWithCategories(products),
        });
    } catch (error) {
        console.error(">>> Error at getFavoriteProductsService:", error);
        return serviceResponse(500, { EC: -1, EM: "System error" });
    }
};

const getViewedProductsService = async (email) => {
    try {
        if (!global.dbConnected) {
            const user = global.mockUsers?.find((item) => item.email === email);
            const products = (user?.viewedProducts || [])
                .map((item) => global.mockProductSnapshots[Number(item.productId)])
                .filter(Boolean);
            return serviceResponse(200, {
                EC: 0,
                EM: "Viewed products loaded successfully (Memory Fallback)",
                products,
            });
        }

        const user = await userRepository.findByEmail(email);
        if (!user) {
            return serviceResponse(404, { EC: 1, EM: "User not found" });
        }

        const viewedIds = (user.viewedProducts || []).map((item) => Number(item.productId));
        const products = await productRepository.findByIds(viewedIds);
        const order = new Map(viewedIds.map((id, index) => [id, index]));
        const sortedProducts = products.sort((a, b) => (order.get(a.id) || 0) - (order.get(b.id) || 0));

        return serviceResponse(200, {
            EC: 0,
            EM: "Viewed products loaded successfully",
            products: await mapProductsWithCategories(sortedProducts),
        });
    } catch (error) {
        console.error(">>> Error at getViewedProductsService:", error);
        return serviceResponse(500, { EC: -1, EM: "System error" });
    }
};

module.exports = {
    getFavoriteProductsService,
    getViewedProductsService,
    recordViewedProduct,
    toggleFavoriteService,
};
