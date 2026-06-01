const {
    createReviewService,
    getProductReviewsService,
} = require("../services/reviewService");

const sendServiceResponse = (res, result) => res.status(result.statusCode).json(result.data);

const getProductReviews = async (req, res) => {
    const result = await getProductReviewsService(req.params.slug);
    return sendServiceResponse(res, result);
};

const createProductReview = async (req, res) => {
    const result = await createReviewService(req.user.email, req.params.slug, req.body);
    return sendServiceResponse(res, result);
};

module.exports = {
    createProductReview,
    getProductReviews,
};
