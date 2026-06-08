const {
    createOrderService,
    getOrdersService,
    getOrderByIdService,
    cancelOrderService,
    requestReturnOrderService,
    updateOrderStatusService,
    receiveOrderService,
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

const getAllOrders = async (req, res) => {
    const result = await getOrdersService(req.user.email, req.user.role, {
        ...req.query,
        all: "true",
    });
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

const requestReturnOrder = async (req, res) => {
    const result = await requestReturnOrderService(req.params.id, req.user.email, req.body.reason);
    return sendServiceResponse(res, result);
};

const receiveOrder = async (req, res) => {
    const result = await receiveOrderService(req.params.id, req.user.email);
    return sendServiceResponse(res, result);
};

const updateOrderStatus = async (req, res) => {
    const result = await updateOrderStatusService(req.params.id, req.user.email, req.user.role, req.body);
    return sendServiceResponse(res, result);
};

module.exports = {
    createOrder,
    getOrders,
    getAllOrders,
    getOrderById,
    cancelOrder,
    requestReturnOrder,
    receiveOrder,
    updateOrderStatus,
};
