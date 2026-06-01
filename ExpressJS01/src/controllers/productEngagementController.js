const {
    getFavoriteProductsService,
    getViewedProductsService,
    toggleFavoriteService,
} = require("../services/productEngagementService");

const sendServiceResponse = (res, result) => res.status(result.statusCode).json(result.data);

const toggleFavorite = async (req, res) => {
    const result = await toggleFavoriteService(req.user.email, req.params.slug, req.body);
    return sendServiceResponse(res, result);
};

const getFavorites = async (req, res) => {
    const result = await getFavoriteProductsService(req.user.email);
    return sendServiceResponse(res, result);
};

const getViewedProducts = async (req, res) => {
    const result = await getViewedProductsService(req.user.email);
    return sendServiceResponse(res, result);
};

module.exports = {
    getFavorites,
    getViewedProducts,
    toggleFavorite,
};
