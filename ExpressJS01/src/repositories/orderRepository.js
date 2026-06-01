const Order = require("../models/order");

const create = (data) => Order.create(data);

const findAllNewest = () => Order.find({}).sort({ createdAt: -1 });

const findByUserNewest = (userId) => Order.find({ userId }).sort({ createdAt: -1 });

const findById = (id) => Order.findById(id);

const getReviewableProductOrderQuery = ({ userId, productId, orderId }) => {
    const query = {
        userId,
        status: { $ne: 6 },
        cancelRequested: { $ne: true },
        "items.productId": Number(productId),
    };

    if (orderId) {
        query._id = orderId;
    }

    return query;
};

const findReviewableOrderWithProduct = (params) => Order.findOne(getReviewableProductOrderQuery(params));

const findReviewableOrdersWithProduct = (params) => Order
    .find(getReviewableProductOrderQuery(params))
    .sort({ createdAt: -1 });

const countBuyersByProductId = async (productId) => {
    const buyers = await Order.distinct("userId", {
        status: { $ne: 6 },
        cancelRequested: { $ne: true },
        "items.productId": Number(productId),
    });

    return buyers.length;
};

const autoConfirmOlderThan = (date) => Order.updateMany(
    { status: 1, createdAt: { $lte: date } },
    { status: 2 },
);

const save = (order) => order.save();

module.exports = {
    create,
    findAllNewest,
    findByUserNewest,
    findById,
    findReviewableOrderWithProduct,
    findReviewableOrdersWithProduct,
    countBuyersByProductId,
    autoConfirmOlderThan,
    save,
};
