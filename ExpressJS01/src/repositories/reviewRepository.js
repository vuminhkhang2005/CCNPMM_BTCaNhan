const Review = require("../models/review");

const create = (data) => Review.create(data);

const findByProductId = (productId) => Review.find({ productId: Number(productId) }).sort({ createdAt: -1 });

const findByUserProductOrder = ({ userEmail, productId, orderId }) => Review.findOne({
    userEmail,
    productId: Number(productId),
    orderId,
});

const countByProductId = (productId) => Review.countDocuments({ productId: Number(productId) });

const averageRatingByProductId = async (productId) => {
    const [stats] = await Review.aggregate([
        { $match: { productId: Number(productId) } },
        { $group: { _id: "$productId", average: { $avg: "$rating" }, count: { $sum: 1 } } },
    ]);

    return stats || { average: 0, count: 0 };
};

module.exports = {
    create,
    findByProductId,
    findByUserProductOrder,
    countByProductId,
    averageRatingByProductId,
};
