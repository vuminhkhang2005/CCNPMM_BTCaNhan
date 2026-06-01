const couponService = require("./couponService");
const userRepository = require("../repositories/userRepository");
const cartRepository = require("../repositories/cartRepository");
const orderRepository = require("../repositories/orderRepository");

if (!global.mockOrders) {
    global.mockOrders = [];
}

const serviceResponse = (statusCode, data) => ({ statusCode, data });

const getMockUser = (email) => global.mockUsers?.find((user) => user.email === email);

const getOrderSubtotal = (items = []) => items.reduce((sum, item) => (
    sum + Number(item.price || 0) * Number(item.quantity || 0)
), 0);

const resolveOrderPricing = async ({ email, user, subtotal, couponCode, pointsRequested }) => {
    let coupon = null;
    let couponDiscount = 0;

    if (couponCode) {
        const couponResult = await couponService.validateCoupon({ email, code: couponCode, subtotal });
        if (couponResult.EC !== 0) {
            return { error: couponResult };
        }
        coupon = couponResult.coupon;
        couponDiscount = couponResult.discount;
    }

    const pointsAvailable = Number(user?.points || 0);
    const { pointsUsed, pointsDiscount } = couponService.calculatePointsDiscount({
        pointsAvailable,
        pointsRequested,
        subtotal,
        couponDiscount,
    });
    const discountAmount = couponDiscount + pointsDiscount;
    const totalAmount = Math.max(subtotal - discountAmount, 0);

    return {
        coupon,
        couponCode: coupon?.code || "",
        couponDiscount,
        discountAmount,
        pointsDiscount,
        pointsUsed,
        subtotalAmount: subtotal,
        totalAmount,
    };
};

const generateMockId = () => Array.from(
    { length: 24 },
    () => Math.floor(Math.random() * 16).toString(16),
).join("");

const autoConfirmMockOrders = () => {
    try {
        const thirtyMinsAgo = Date.now() - 30 * 60 * 1000;
        global.mockOrders.forEach((order) => {
            if (order.status === 1 && new Date(order.createdAt).getTime() <= thirtyMinsAgo) {
                order.status = 2;
                order.updatedAt = new Date();
            }
        });
    } catch (error) {
        console.error(">>> Error at autoConfirmMockOrders:", error);
    }
};

const autoConfirmOrders = async () => {
    try {
        const thirtyMinsAgo = new Date(Date.now() - 30 * 60 * 1000);
        await orderRepository.autoConfirmOlderThan(thirtyMinsAgo);
    } catch (error) {
        console.error(">>> Error at autoConfirmOrders:", error);
    }
};

const createOrderService = async (email, orderData) => {
    try {
        const { customerInfo, items, paymentMethod, paymentStatus, couponCode, pointsUsed: requestedPoints } = orderData;
        if (!customerInfo || !items || !items.length || !paymentMethod) {
            return serviceResponse(400, { EC: 1, EM: "Missing required order information" });
        }
        const subtotalAmount = getOrderSubtotal(items);

        if (!global.dbConnected) {
            const user = getMockUser(email);
            const pricing = await resolveOrderPricing({
                email,
                user,
                subtotal: subtotalAmount,
                couponCode,
                pointsRequested: requestedPoints,
            });
            if (pricing.error) {
                return serviceResponse(400, pricing.error);
            }

            const order = {
                _id: generateMockId(),
                userId: "mock_user_id",
                userEmail: email,
                customerInfo,
                items,
                subtotalAmount: pricing.subtotalAmount,
                discountAmount: pricing.discountAmount,
                couponCode: pricing.couponCode,
                couponDiscount: pricing.couponDiscount,
                pointsUsed: pricing.pointsUsed,
                pointsDiscount: pricing.pointsDiscount,
                totalAmount: pricing.totalAmount,
                paymentMethod,
                paymentStatus: paymentStatus || "Pending",
                status: 1,
                cancelRequested: false,
                createdAt: new Date(),
                updatedAt: new Date(),
            };

            global.mockOrders.push(order);
            if (user && pricing.pointsUsed > 0) {
                user.points = Number(user.points || 0) - pricing.pointsUsed;
            }
            if (pricing.couponCode) {
                await couponService.markCouponUsed({ email, code: pricing.couponCode });
            }

            if (global.mockCarts?.[email]) {
                global.mockCarts[email].items = [];
            }

            return serviceResponse(201, {
                EC: 0,
                EM: "Order placed successfully (Memory Fallback)",
                order,
            });
        }

        const user = await userRepository.findByEmail(email);
        if (!user) {
            return serviceResponse(404, { EC: 1, EM: "User not found" });
        }
        const pricing = await resolveOrderPricing({
            email,
            user,
            subtotal: subtotalAmount,
            couponCode,
            pointsRequested: requestedPoints,
        });
        if (pricing.error) {
            return serviceResponse(400, pricing.error);
        }

        const order = await orderRepository.create({
            userId: user._id,
            customerInfo,
            items,
            subtotalAmount: pricing.subtotalAmount,
            discountAmount: pricing.discountAmount,
            couponCode: pricing.couponCode,
            couponDiscount: pricing.couponDiscount,
            pointsUsed: pricing.pointsUsed,
            pointsDiscount: pricing.pointsDiscount,
            totalAmount: pricing.totalAmount,
            paymentMethod,
            paymentStatus: paymentStatus || "Pending",
            status: 1,
        });
        if (pricing.pointsUsed > 0) {
            user.points = Number(user.points || 0) - pricing.pointsUsed;
            await userRepository.save(user);
        }
        if (pricing.couponCode) {
            await couponService.markCouponUsed({ email, code: pricing.couponCode });
        }

        const cart = await cartRepository.findByUserId(user._id);
        if (cart) {
            cart.items = [];
            await cartRepository.save(cart);
        }

        return serviceResponse(201, {
            EC: 0,
            EM: "Order placed successfully",
            order,
        });
    } catch (error) {
        console.error(">>> Error at createOrderService:", error);
        return serviceResponse(500, { EC: -1, EM: "System error" });
    }
};

const getOrdersService = async (email, role, query = {}) => {
    try {
        if (!global.dbConnected) {
            autoConfirmMockOrders();

            if (query.all === "true") {
                if (role !== "ADMIN") {
                    return serviceResponse(403, { EC: 1, EM: "Only administrators can manage orders (Memory Fallback)" });
                }

                const orders = [...global.mockOrders].sort((a, b) => b.createdAt - a.createdAt);
                return serviceResponse(200, {
                    EC: 0,
                    EM: "Orders loaded successfully (Memory Fallback)",
                    orders,
                });
            }

            const orders = global.mockOrders
                .filter((order) => order.userEmail === email)
                .sort((a, b) => b.createdAt - a.createdAt);

            return serviceResponse(200, {
                EC: 0,
                EM: "Orders loaded successfully (Memory Fallback)",
                orders,
            });
        }

        await autoConfirmOrders();

        const user = await userRepository.findByEmail(email);
        if (!user) {
            return serviceResponse(404, { EC: 1, EM: "User not found" });
        }

        if (query.all === "true") {
            if (user.role !== "ADMIN") {
                return serviceResponse(403, { EC: 1, EM: "Only administrators can manage orders" });
            }

            const orders = await orderRepository.findAllNewest();
            return serviceResponse(200, {
                EC: 0,
                EM: "Orders loaded successfully",
                orders,
            });
        }

        const orders = await orderRepository.findByUserNewest(user._id);

        return serviceResponse(200, {
            EC: 0,
            EM: "Orders loaded successfully",
            orders,
        });
    } catch (error) {
        console.error(">>> Error at getOrdersService:", error);
        return serviceResponse(500, { EC: -1, EM: "System error" });
    }
};

const getOrderByIdService = async (id, email, role) => {
    try {
        if (!global.dbConnected) {
            autoConfirmMockOrders();

            const order = global.mockOrders.find((item) => item._id === id);
            if (!order) {
                return serviceResponse(404, { EC: 2, EM: "Order not found (Memory Fallback)" });
            }

            if (order.userEmail !== email && role !== "ADMIN") {
                return serviceResponse(403, { EC: 3, EM: "Unauthorized to access this order (Memory Fallback)" });
            }

            if (order.status === 1) {
                const thirtyMinsAgo = Date.now() - 30 * 60 * 1000;
                if (new Date(order.createdAt).getTime() <= thirtyMinsAgo) {
                    order.status = 2;
                    order.updatedAt = new Date();
                }
            }

            return serviceResponse(200, {
                EC: 0,
                EM: "Order loaded successfully (Memory Fallback)",
                order,
            });
        }

        await autoConfirmOrders();

        const user = await userRepository.findByEmail(email);
        if (!user) {
            return serviceResponse(404, { EC: 1, EM: "User not found" });
        }

        const order = await orderRepository.findById(id);
        if (!order) {
            return serviceResponse(404, { EC: 2, EM: "Order not found" });
        }

        if (order.userId.toString() !== user._id.toString() && user.role !== "ADMIN") {
            return serviceResponse(403, { EC: 3, EM: "Unauthorized to access this order" });
        }

        if (order.status === 1) {
            const thirtyMinsAgo = new Date(Date.now() - 30 * 60 * 1000);
            if (order.createdAt <= thirtyMinsAgo) {
                order.status = 2;
                await orderRepository.save(order);
            }
        }

        return serviceResponse(200, {
            EC: 0,
            EM: "Order loaded successfully",
            order,
        });
    } catch (error) {
        console.error(">>> Error at getOrderByIdService:", error);
        return serviceResponse(500, { EC: -1, EM: "System error" });
    }
};

const cancelOrderService = async (id, email, reason) => {
    try {
        if (!global.dbConnected) {
            const order = global.mockOrders.find((item) => item._id === id);
            if (!order) {
                return serviceResponse(404, { EC: 2, EM: "Order not found (Memory Fallback)" });
            }

            if (order.userEmail !== email) {
                return serviceResponse(403, { EC: 3, EM: "Unauthorized to cancel this order (Memory Fallback)" });
            }

            const timeDiffMs = Date.now() - new Date(order.createdAt).getTime();
            const thirtyMinsMs = 30 * 60 * 1000;

            if (order.status === 3) {
                order.cancelRequested = true;
                order.cancelReason = reason || "Customer requested cancellation";
                order.updatedAt = new Date();
                return serviceResponse(200, {
                    EC: 0,
                    EM: "Cancellation request sent to the shop successfully (Memory Fallback)",
                    order,
                });
            }

            if ((order.status === 1 || order.status === 2) && timeDiffMs < thirtyMinsMs) {
                order.status = 6;
                order.cancelReason = reason || "Customer cancelled order";
                order.updatedAt = new Date();
                return serviceResponse(200, {
                    EC: 0,
                    EM: "Order cancelled successfully (Memory Fallback)",
                    order,
                });
            }

            return serviceResponse(400, {
                EC: 4,
                EM: "Order cannot be cancelled. The 30-minute cancellation window has passed, or the order is already in delivery.",
            });
        }

        const user = await userRepository.findByEmail(email);
        if (!user) {
            return serviceResponse(404, { EC: 1, EM: "User not found" });
        }

        const order = await orderRepository.findById(id);
        if (!order) {
            return serviceResponse(404, { EC: 2, EM: "Order not found" });
        }

        if (order.userId.toString() !== user._id.toString()) {
            return serviceResponse(403, { EC: 3, EM: "Unauthorized to cancel this order" });
        }

        const timeDiffMs = Date.now() - order.createdAt.getTime();
        const thirtyMinsMs = 30 * 60 * 1000;

        if (order.status === 3) {
            order.cancelRequested = true;
            order.cancelReason = reason || "Customer requested cancellation";
            await orderRepository.save(order);
            return serviceResponse(200, {
                EC: 0,
                EM: "Cancellation request sent to the shop successfully",
                order,
            });
        }

        if ((order.status === 1 || order.status === 2) && timeDiffMs < thirtyMinsMs) {
            order.status = 6;
            order.cancelReason = reason || "Customer cancelled order";
            await orderRepository.save(order);
            return serviceResponse(200, {
                EC: 0,
                EM: "Order cancelled successfully",
                order,
            });
        }

        return serviceResponse(400, {
            EC: 4,
            EM: "Order cannot be cancelled. The 30-minute cancellation window has passed, or the order is already in delivery.",
        });
    } catch (error) {
        console.error(">>> Error at cancelOrderService:", error);
        return serviceResponse(500, { EC: -1, EM: "System error" });
    }
};

const updateOrderStatusService = async (id, email, role, updateData = {}) => {
    try {
        const { status, action } = updateData;

        if (!global.dbConnected) {
            if (role !== "ADMIN") {
                return serviceResponse(403, { EC: 1, EM: "Only administrators can perform this action (Memory Fallback)" });
            }

            const order = global.mockOrders.find((item) => item._id === id);
            if (!order) {
                return serviceResponse(404, { EC: 2, EM: "Order not found (Memory Fallback)" });
            }

            if (action === "approve-cancel") {
                order.status = 6;
                order.cancelRequested = false;
            } else if (action === "reject-cancel") {
                order.cancelRequested = false;
            } else if (status !== undefined) {
                const nextStatus = Number(status);
                if (Number.isNaN(nextStatus) || nextStatus < 1 || nextStatus > 6) {
                    return serviceResponse(400, { EC: 4, EM: "Invalid order status (Memory Fallback)" });
                }

                order.status = nextStatus;
                if (Number(status) === 5) {
                    order.paymentStatus = "Paid";
                }
            } else {
                return serviceResponse(400, { EC: 3, EM: "Missing update details (Memory Fallback)" });
            }

            order.updatedAt = new Date();

            return serviceResponse(200, {
                EC: 0,
                EM: "Order updated successfully (Memory Fallback)",
                order,
            });
        }

        const user = await userRepository.findByEmail(email);
        if (!user || user.role !== "ADMIN") {
            return serviceResponse(403, { EC: 1, EM: "Only administrators can perform this action" });
        }

        const order = await orderRepository.findById(id);
        if (!order) {
            return serviceResponse(404, { EC: 2, EM: "Order not found" });
        }

        if (action === "approve-cancel") {
            order.status = 6;
            order.cancelRequested = false;
        } else if (action === "reject-cancel") {
            order.cancelRequested = false;
        } else if (status !== undefined) {
            const nextStatus = Number(status);
            if (Number.isNaN(nextStatus) || nextStatus < 1 || nextStatus > 6) {
                return serviceResponse(400, { EC: 4, EM: "Invalid order status" });
            }

            order.status = nextStatus;
            if (Number(status) === 5) {
                order.paymentStatus = "Paid";
            }
        } else {
            return serviceResponse(400, { EC: 3, EM: "Missing update details" });
        }

        await orderRepository.save(order);

        return serviceResponse(200, {
            EC: 0,
            EM: "Order updated successfully",
            order,
        });
    } catch (error) {
        console.error(">>> Error at updateOrderStatusService:", error);
        return serviceResponse(500, { EC: -1, EM: "System error" });
    }
};

module.exports = {
    createOrderService,
    getOrdersService,
    getOrderByIdService,
    cancelOrderService,
    updateOrderStatusService,
};
