const couponService = require("./couponService");
const userRepository = require("../repositories/userRepository");
const cartRepository = require("../repositories/cartRepository");
const orderRepository = require("../repositories/orderRepository");
const productRepository = require("../repositories/productRepository");
const { findVariant, prepareProductForStorage } = require("../utils/productVariants");

if (!global.mockOrders) {
    global.mockOrders = [];
}

const serviceResponse = (statusCode, data) => ({ statusCode, data });

const getMockUser = (email) => global.mockUsers?.find((user) => user.email === email);

const ORDER_STATUS = Object.freeze({
    NEW: 1,
    CONFIRMED: 2,
    PREPARING: 3,
    DELIVERING: 4,
    DELIVERED: 5,
    CANCELLED: 6,
    RETURN_PROCESSING: 7,
    RETURNED: 8,
    RECEIVED: 9,
});

const ORDER_STATUS_LABELS = Object.freeze({
    [ORDER_STATUS.NEW]: "New order",
    [ORDER_STATUS.CONFIRMED]: "Confirmed",
    [ORDER_STATUS.PREPARING]: "Preparing",
    [ORDER_STATUS.DELIVERING]: "Delivering",
    [ORDER_STATUS.DELIVERED]: "Delivered",
    [ORDER_STATUS.CANCELLED]: "Cancelled",
    [ORDER_STATUS.RETURN_PROCESSING]: "Return processing",
    [ORDER_STATUS.RETURNED]: "Returned",
    [ORDER_STATUS.RECEIVED]: "Received",
});

const STATUS_TRANSITIONS = Object.freeze({
    [ORDER_STATUS.NEW]: [ORDER_STATUS.CONFIRMED, ORDER_STATUS.CANCELLED],
    [ORDER_STATUS.CONFIRMED]: [ORDER_STATUS.PREPARING, ORDER_STATUS.CANCELLED],
    [ORDER_STATUS.PREPARING]: [ORDER_STATUS.DELIVERING, ORDER_STATUS.CANCELLED],
    [ORDER_STATUS.DELIVERING]: [ORDER_STATUS.DELIVERED],
    [ORDER_STATUS.DELIVERED]: [ORDER_STATUS.RECEIVED, ORDER_STATUS.RETURN_PROCESSING],
    [ORDER_STATUS.CANCELLED]: [],
    [ORDER_STATUS.RETURN_PROCESSING]: [ORDER_STATUS.RETURNED],
    [ORDER_STATUS.RETURNED]: [],
    [ORDER_STATUS.RECEIVED]: [],
});

const CANCEL_ACTIONS = Object.freeze({
    APPROVE: "approve-cancel",
    REJECT: "reject-cancel",
});

const getStatusName = (status) => ORDER_STATUS_LABELS[Number(status)] || "Unknown";

const normalizeNote = (value) => String(value || "").trim();

const getAdminUpdateNote = (updateData = {}) => normalizeNote(
    updateData.note || updateData.adminNote || updateData.reason,
);

const appendStatusHistory = (order, historyItem) => {
    if (!Array.isArray(order.statusHistory)) {
        order.statusHistory = [];
    }

    order.statusHistory.push({
        ...historyItem,
        createdAt: new Date(),
    });
};

const serviceError = (statusCode, EC, EM) => ({ statusCode, data: { EC, EM } });

const applyAdminOrderFlowUpdate = (order, updateData = {}, actorEmail = "") => {
    const requestedAction = updateData.action || (updateData.status !== undefined ? "update-status" : "");
    const note = getAdminUpdateNote(updateData);

    if (!note) {
        return serviceError(400, 5, "A submit note is required to update order flow");
    }

    if (requestedAction === CANCEL_ACTIONS.APPROVE || requestedAction === CANCEL_ACTIONS.REJECT) {
        if (!order.cancelRequested) {
            return serviceError(400, 6, "This order does not have a pending cancellation request");
        }

        const currentStatus = Number(order.status);
        order.cancelRequested = false;
        order.cancelResolution = requestedAction === CANCEL_ACTIONS.APPROVE ? "APPROVED" : "REJECTED";
        order.cancelResolutionNote = note;
        order.cancelResolvedBy = actorEmail;
        order.cancelResolvedAt = new Date();

        if (requestedAction === CANCEL_ACTIONS.APPROVE) {
            order.status = ORDER_STATUS.CANCELLED;
        }

        appendStatusHistory(order, {
            action: requestedAction,
            fromStatus: currentStatus,
            toStatus: Number(order.status),
            note,
            actorEmail,
        });

        return null;
    }

    if (order.cancelRequested) {
        return serviceError(409, 7, "Resolve the pending cancellation request before changing order status");
    }

    if (updateData.status === undefined) {
        return serviceError(400, 3, "Missing update details");
    }

    const nextStatus = Number(updateData.status);
    const currentStatus = Number(order.status);
    const allowedNextStatuses = STATUS_TRANSITIONS[currentStatus] || [];

    if (!Object.values(ORDER_STATUS).includes(nextStatus)) {
        return serviceError(400, 4, "Invalid order status");
    }

    if (!allowedNextStatuses.includes(nextStatus)) {
        const allowedText = allowedNextStatuses.map(getStatusName).join(", ") || "no further status";
        return serviceError(400, 8, `Invalid order flow. Allowed next status: ${allowedText}`);
    }

    order.status = nextStatus;

    if (nextStatus === ORDER_STATUS.DELIVERED) {
        order.paymentStatus = "Paid";
    }

    if (nextStatus === ORDER_STATUS.CANCELLED) {
        order.cancelRequested = false;
        order.cancelReason = note;
    }

    if (nextStatus === ORDER_STATUS.RETURNED) {
        order.returnResolvedBy = actorEmail;
        order.returnResolvedAt = new Date();
    }

    appendStatusHistory(order, {
        action: requestedAction === "cancel-order" ? "cancel-order" : "update-status",
        fromStatus: currentStatus,
        toStatus: nextStatus,
        note,
        actorEmail,
    });

    return null;
};

const getOrderSubtotal = (items = []) => items.reduce((sum, item) => (
    sum + Number(item.price || 0) * Number(item.quantity || 0)
), 0);

const normalizeFallbackOrderItems = (items = []) => items.map((item) => ({
    ...item,
    productId: Number(item.productId),
    variantId: item.variantId || `${item.slug}-${item.color}-${item.size}`,
    sku: item.sku || `${item.slug}-${item.color}-${item.size}`.toUpperCase(),
    price: Number(item.price || 0),
    size: Number(item.size),
    quantity: Number(item.quantity || 0),
}));

const buildOrderItemFromVariant = (product, variant, quantity) => ({
    productId: Number(product.id),
    variantId: variant.variantId,
    sku: variant.sku,
    slug: product.slug,
    name: product.name,
    price: Number(variant.price || product.price),
    color: variant.color,
    size: Number(variant.size),
    quantity,
    image: variant.image || variant.images?.[0] || product.images?.[0],
});

const resolveOrderItemsFromProducts = async (items = []) => {
    const resolvedItems = [];

    for (const item of items) {
        const quantity = Number(item.quantity);
        if (!Number.isInteger(quantity) || quantity <= 0) {
            return { error: { EC: 10, EM: "Invalid item quantity" } };
        }

        const product = item.productId
            ? await productRepository.findByIdNumber(item.productId)
            : await productRepository.findBySlug(item.slug);

        if (!product) {
            return { error: { EC: 11, EM: "Product not found while creating order" } };
        }

        const productData = prepareProductForStorage(product.toObject());
        const variant = findVariant(productData, {
            variantId: item.variantId,
            color: item.color,
            size: item.size,
        });

        if (!variant || variant.isActive === false) {
            return { error: { EC: 12, EM: "Product variant not found while creating order" } };
        }

        resolvedItems.push(buildOrderItemFromVariant(productData, variant, quantity));
    }

    return { items: resolvedItems };
};

const rollbackReservedStock = async (items = []) => {
    await Promise.allSettled(items.map((item) => productRepository.releaseVariantStock({
        productId: item.productId,
        variantId: item.variantId,
        quantity: item.quantity,
    })));
};

const reserveOrderStock = async (items = []) => {
    const reservedItems = [];

    for (const item of items) {
        const result = await productRepository.reserveVariantStock({
            productId: item.productId,
            variantId: item.variantId,
            quantity: item.quantity,
        });

        if (result.modifiedCount === 0) {
            await rollbackReservedStock(reservedItems);
            return {
                error: {
                    EC: 13,
                    EM: `Not enough stock for ${item.name} - ${item.color} size ${item.size}`,
                },
            };
        }

        reservedItems.push(item);
    }

    return { reservedItems };
};

const releaseOrderStockIfNeeded = async (order) => {
    if (!order || order.stockReleased) return;

    const releasableItems = (order.items || []).filter((item) => item.variantId && Number(item.quantity) > 0);
    if (releasableItems.length === 0) {
        order.stockReleased = true;
        return;
    }

    await rollbackReservedStock(releasableItems);
    order.stockReleased = true;
};

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

        if (!global.dbConnected) {
            const user = getMockUser(email);
            const normalizedItems = normalizeFallbackOrderItems(items);
            const subtotalAmount = getOrderSubtotal(normalizedItems);
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
                items: normalizedItems,
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
                statusHistory: [{
                    action: "create-order",
                    toStatus: ORDER_STATUS.NEW,
                    note: "Order created",
                    actorEmail: email,
                    createdAt: new Date(),
                }],
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

        const resolvedOrderItems = await resolveOrderItemsFromProducts(items);
        if (resolvedOrderItems.error) {
            return serviceResponse(400, resolvedOrderItems.error);
        }

        const subtotalAmount = getOrderSubtotal(resolvedOrderItems.items);
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

        const reservation = await reserveOrderStock(resolvedOrderItems.items);
        if (reservation.error) {
            return serviceResponse(409, reservation.error);
        }

        let order;
        try {
            order = await orderRepository.create({
                userId: user._id,
                customerInfo,
                items: resolvedOrderItems.items,
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
                stockReleased: false,
                statusHistory: [{
                    action: "create-order",
                    toStatus: ORDER_STATUS.NEW,
                    note: "Order created",
                    actorEmail: email,
                }],
            });
        } catch (error) {
            await rollbackReservedStock(reservation.reservedItems);
            throw error;
        }

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
                order.cancelResolution = "";
                order.cancelResolutionNote = "";
                order.cancelResolvedBy = "";
                order.cancelResolvedAt = undefined;
                appendStatusHistory(order, {
                    action: "request-cancel",
                    fromStatus: Number(order.status),
                    toStatus: Number(order.status),
                    note: order.cancelReason,
                    actorEmail: email,
                });
                order.updatedAt = new Date();
                return serviceResponse(200, {
                    EC: 0,
                    EM: "Cancellation request sent to the shop successfully (Memory Fallback)",
                    order,
                });
            }

            if ((order.status === 1 || order.status === 2) && timeDiffMs < thirtyMinsMs) {
                const currentStatus = Number(order.status);
                order.status = 6;
                order.cancelReason = reason || "Customer cancelled order";
                order.cancelRequested = false;
                appendStatusHistory(order, {
                    action: "customer-cancel",
                    fromStatus: currentStatus,
                    toStatus: ORDER_STATUS.CANCELLED,
                    note: order.cancelReason,
                    actorEmail: email,
                });
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
            order.cancelResolution = "";
            order.cancelResolutionNote = "";
            order.cancelResolvedBy = "";
            order.cancelResolvedAt = undefined;
            appendStatusHistory(order, {
                action: "request-cancel",
                fromStatus: Number(order.status),
                toStatus: Number(order.status),
                note: order.cancelReason,
                actorEmail: email,
            });
            await orderRepository.save(order);
            return serviceResponse(200, {
                EC: 0,
                EM: "Cancellation request sent to the shop successfully",
                order,
            });
        }

        if ((order.status === 1 || order.status === 2) && timeDiffMs < thirtyMinsMs) {
            const currentStatus = Number(order.status);
            order.status = 6;
            order.cancelReason = reason || "Customer cancelled order";
            order.cancelRequested = false;
            await releaseOrderStockIfNeeded(order);
            appendStatusHistory(order, {
                action: "customer-cancel",
                fromStatus: currentStatus,
                toStatus: ORDER_STATUS.CANCELLED,
                note: order.cancelReason,
                actorEmail: email,
            });
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

const requestReturnOrderService = async (id, email, reason) => {
    try {
        const returnReason = normalizeNote(reason) || "Customer requested return";

        if (!global.dbConnected) {
            const order = global.mockOrders.find((item) => item._id === id);
            if (!order) {
                return serviceResponse(404, { EC: 2, EM: "Order not found (Memory Fallback)" });
            }

            if (order.userEmail !== email) {
                return serviceResponse(403, { EC: 3, EM: "Unauthorized to request return for this order (Memory Fallback)" });
            }

            if (Number(order.status) !== ORDER_STATUS.DELIVERED) {
                return serviceResponse(400, {
                    EC: 4,
                    EM: "Return request can only be created after the order has been delivered (Memory Fallback)",
                });
            }

            order.status = ORDER_STATUS.RETURN_PROCESSING;
            order.returnReason = returnReason;
            order.returnRequestedAt = new Date();
            order.updatedAt = new Date();

            appendStatusHistory(order, {
                action: "request-return",
                fromStatus: ORDER_STATUS.DELIVERED,
                toStatus: ORDER_STATUS.RETURN_PROCESSING,
                note: returnReason,
                actorEmail: email,
            });

            return serviceResponse(200, {
                EC: 0,
                EM: "Return request sent to the shop successfully (Memory Fallback)",
                order,
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
            return serviceResponse(403, { EC: 3, EM: "Unauthorized to request return for this order" });
        }

        if (Number(order.status) !== ORDER_STATUS.DELIVERED) {
            return serviceResponse(400, {
                EC: 4,
                EM: "Return request can only be created after the order has been delivered",
            });
        }

        order.status = ORDER_STATUS.RETURN_PROCESSING;
        order.returnReason = returnReason;
        order.returnRequestedAt = new Date();

        appendStatusHistory(order, {
            action: "request-return",
            fromStatus: ORDER_STATUS.DELIVERED,
            toStatus: ORDER_STATUS.RETURN_PROCESSING,
            note: returnReason,
            actorEmail: email,
        });

        await orderRepository.save(order);

        return serviceResponse(200, {
            EC: 0,
            EM: "Return request sent to the shop successfully",
            order,
        });
    } catch (error) {
        console.error(">>> Error at requestReturnOrderService:", error);
        return serviceResponse(500, { EC: -1, EM: "System error" });
    }
};

const updateOrderStatusService = async (id, email, role, updateData = {}) => {
    try {
        if (!global.dbConnected) {
            if (role !== "ADMIN") {
                return serviceResponse(403, { EC: 1, EM: "Only administrators can perform this action (Memory Fallback)" });
            }

            const order = global.mockOrders.find((item) => item._id === id);
            if (!order) {
                return serviceResponse(404, { EC: 2, EM: "Order not found (Memory Fallback)" });
            }

            const flowError = applyAdminOrderFlowUpdate(order, updateData, email);
            if (flowError) {
                return serviceResponse(flowError.statusCode, {
                    ...flowError.data,
                    EM: `${flowError.data.EM} (Memory Fallback)`,
                });
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

        const flowError = applyAdminOrderFlowUpdate(order, updateData, email);
        if (flowError) {
            return serviceResponse(flowError.statusCode, flowError.data);
        }

        if ([ORDER_STATUS.CANCELLED, ORDER_STATUS.RETURNED].includes(Number(order.status))) {
            await releaseOrderStockIfNeeded(order);
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

const receiveOrderService = async (id, email) => {
    try {
        if (!global.dbConnected) {
            const order = global.mockOrders.find((item) => item._id === id);
            if (!order) {
                return serviceResponse(404, { EC: 2, EM: "Order not found (Memory Fallback)" });
            }

            if (order.userEmail !== email) {
                return serviceResponse(403, { EC: 3, EM: "Unauthorized to confirm receipt for this order (Memory Fallback)" });
            }

            if (Number(order.status) !== ORDER_STATUS.DELIVERED) {
                return serviceResponse(400, {
                    EC: 4,
                    EM: "Order can only be confirmed as received after it has been delivered (Memory Fallback)",
                });
            }

            order.status = ORDER_STATUS.RECEIVED;
            order.updatedAt = new Date();

            appendStatusHistory(order, {
                action: "confirm-receive",
                fromStatus: ORDER_STATUS.DELIVERED,
                toStatus: ORDER_STATUS.RECEIVED,
                note: "Customer confirmed receipt",
                actorEmail: email,
            });

            return serviceResponse(200, {
                EC: 0,
                EM: "Order receipt confirmed successfully (Memory Fallback)",
                order,
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
            return serviceResponse(403, { EC: 3, EM: "Unauthorized to confirm receipt for this order" });
        }

        if (Number(order.status) !== ORDER_STATUS.DELIVERED) {
            return serviceResponse(400, {
                EC: 4,
                EM: "Order can only be confirmed as received after it has been delivered",
            });
        }

        order.status = ORDER_STATUS.RECEIVED;

        appendStatusHistory(order, {
            action: "confirm-receive",
            fromStatus: ORDER_STATUS.DELIVERED,
            toStatus: ORDER_STATUS.RECEIVED,
            note: "Customer confirmed receipt",
            actorEmail: email,
        });

        await orderRepository.save(order);

        return serviceResponse(200, {
            EC: 0,
            EM: "Order receipt confirmed successfully",
            order,
        });
    } catch (error) {
        console.error(">>> Error at receiveOrderService:", error);
        return serviceResponse(500, { EC: -1, EM: "System error" });
    }
};

module.exports = {
    createOrderService,
    getOrdersService,
    getOrderByIdService,
    cancelOrderService,
    requestReturnOrderService,
    updateOrderStatusService,
    receiveOrderService,
};
