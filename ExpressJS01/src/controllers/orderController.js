const {
    createOrderService,
    getOrdersService,
    getOrderByIdService,
    cancelOrderService,
    updateOrderStatusService,
} = require("../services/orderService");

const sendServiceResponse = (res, result) => res.status(result.statusCode).json(result.data);

const createOrder = async (req, res) => {
    const result = await createOrderService(req.user.email, req.body);
    return sendServiceResponse(res, result);
};

const getOrders = async (req, res) => {
    const result = await getOrdersService(req.user.email, req.user.role, req.query);
    return sendServiceResponse(res, result);
};

const getOrderById = async (req, res) => {
    const result = await getOrderByIdService(req.params.id, req.user.email, req.user.role);
    return sendServiceResponse(res, result);
};

const cancelOrder = async (req, res) => {
    const result = await cancelOrderService(req.params.id, req.user.email, req.body.reason);
    return sendServiceResponse(res, result);
};

const updateOrderStatus = async (req, res) => {
    const result = await updateOrderStatusService(req.params.id, req.user.email, req.user.role, req.body);
    return sendServiceResponse(res, result);
};

module.exports = {
    createOrder,
    getOrders,
    getOrderById,
    cancelOrder,
    updateOrderStatus,
};
