const {
    getProductsService,
    getProductsByCategoryService,
    getProductRankingService,
    getProductCategoriesService,
    getProductDetailService,
} = require("../services/productService");

const getProducts = (req, res) => {
    const data = getProductsService(req.query);
    return res.status(200).json(data);
};

const getProductCategories = (req, res) => {
    const data = getProductCategoriesService();
    return res.status(200).json(data);
};

const getProductsByCategory = (req, res) => {
    const data = getProductsByCategoryService(req.query);
    return res.status(200).json(data);
};

const getProductRanking = (req, res) => {
    const data = getProductRankingService(req.query);
    return res.status(200).json(data);
};

const getProductDetail = (req, res) => {
    const data = getProductDetailService(req.params.slug);
    return res.status(data.EC === 0 ? 200 : 404).json(data);
};

module.exports = {
    getProducts,
    getProductsByCategory,
    getProductRanking,
    getProductCategories,
    getProductDetail,
};
