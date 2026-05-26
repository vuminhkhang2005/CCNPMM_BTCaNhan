const {
    getProductsService,
    getProductsByCategoryService,
    getProductRankingService,
    getProductCategoriesService,
    getProductDetailService,
} = require("../services/productService");

const getProducts = async (req, res) => {
    try {
        const data = await getProductsService(req.query);
        return res.status(200).json(data);
    } catch (error) {
        console.error(">>> Error at getProducts controller:", error);
        return res.status(500).json({ EC: -1, EM: "Internal server error" });
    }
};

const getProductCategories = async (req, res) => {
    try {
        const data = await getProductCategoriesService();
        return res.status(200).json(data);
    } catch (error) {
        console.error(">>> Error at getProductCategories controller:", error);
        return res.status(500).json({ EC: -1, EM: "Internal server error" });
    }
};

const getProductsByCategory = async (req, res) => {
    try {
        const data = await getProductsByCategoryService(req.query);
        return res.status(200).json(data);
    } catch (error) {
        console.error(">>> Error at getProductsByCategory controller:", error);
        return res.status(500).json({ EC: -1, EM: "Internal server error" });
    }
};

const getProductRanking = async (req, res) => {
    try {
        const data = await getProductRankingService(req.query);
        return res.status(200).json(data);
    } catch (error) {
        console.error(">>> Error at getProductRanking controller:", error);
        return res.status(500).json({ EC: -1, EM: "Internal server error" });
    }
};

const getProductDetail = async (req, res) => {
    try {
        const data = await getProductDetailService(req.params.slug);
        return res.status(data.EC === 0 ? 200 : 404).json(data);
    } catch (error) {
        console.error(">>> Error at getProductDetail controller:", error);
        return res.status(500).json({ EC: -1, EM: "Internal server error" });
    }
};

module.exports = {
    getProducts,
    getProductsByCategory,
    getProductRanking,
    getProductCategories,
    getProductDetail,
};

