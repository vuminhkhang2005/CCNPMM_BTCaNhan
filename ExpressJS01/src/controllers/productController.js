const {
    getProductsService,
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

const getProductDetail = (req, res) => {
    const data = getProductDetailService(req.params.slug);
    return res.status(data.EC === 0 ? 200 : 404).json(data);
};

module.exports = {
    getProducts,
    getProductCategories,
    getProductDetail,
};
