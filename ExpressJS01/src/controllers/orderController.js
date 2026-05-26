const User = require("../models/user");
const Order = require("../models/order");
const Cart = require("../models/cart");

// Initialize in-memory orders
if (!global.mockOrders) {
    global.mockOrders = [];
}

const generateMockId = () => {
    return Array.from({ length: 24 }, () => Math.floor(Math.random() * 16).toString(16)).join("");
};

const autoConfirmMockOrders = () => {
    try {
        const thirtyMinsAgo = Date.now() - 30 * 60 * 1000;
        global.mockOrders.forEach((o) => {
            if (o.status === 1 && new Date(o.createdAt).getTime() <= thirtyMinsAgo) {
                o.status = 2;
                o.updatedAt = new Date();
            }
        });
    } catch (error) {
        console.error(">>> Error at autoConfirmMockOrders:", error);
    }
};

const autoConfirmOrders = async () => {
    try {
        const thirtyMinsAgo = new Date(Date.now() - 30 * 60 * 1000);
        await Order.updateMany(
            { status: 1, createdAt: { $lte: thirtyMinsAgo } },
            { status: 2 }
        );
    } catch (error) {
        console.error(">>> Error at autoConfirmOrders:", error);
    }
};

const createOrder = async (req, res) => {
    try {
        const { customerInfo, items, totalAmount, paymentMethod, paymentStatus } = req.body;
        if (!customerInfo || !items || !items.length || !totalAmount || !paymentMethod) {
            return res.status(400).json({ EC: 1, EM: "Missing required order information" });
        }

        const email = req.user.email;

        if (!global.dbConnected) {
            // Memory fallback
            const mockId = generateMockId();
            const order = {
                _id: mockId,
                userId: "mock_user_id",
                userEmail: email,
                customerInfo,
                items,
                totalAmount: Number(totalAmount),
                paymentMethod,
                paymentStatus: paymentStatus || "Pending",
                status: 1,
                cancelRequested: false,
                createdAt: new Date(),
                updatedAt: new Date()
            };

            global.mockOrders.push(order);

            // Clear in-memory cart
            if (global.mockCarts[email]) {
                global.mockCarts[email].items = [];
            }

            return res.status(201).json({
                EC: 0,
                EM: "Order placed successfully (Memory Fallback)",
                order
            });
        }

        // DB implementation
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(404).json({ EC: 1, EM: "User not found" });
        }

        const order = await Order.create({
            userId: user._id,
            customerInfo,
            items,
            totalAmount,
            paymentMethod,
            paymentStatus: paymentStatus || "Pending",
            status: 1
        });

        // Clear the user's cart
        const cart = await Cart.findOne({ userId: user._id });
        if (cart) {
            cart.items = [];
            await cart.save();
        }

        return res.status(201).json({
            EC: 0,
            EM: "Order placed successfully",
            order
        });
    } catch (error) {
        console.error(">>> Error at createOrder:", error);
        return res.status(500).json({ EC: -1, EM: "System error" });
    }
};

const getOrders = async (req, res) => {
    try {
        const email = req.user.email;
        const role = req.user.role;

        if (!global.dbConnected) {
            // Memory fallback
            autoConfirmMockOrders();

            let orders;
            if (req.query.all === "true" && role === "ADMIN") {
                orders = [...global.mockOrders].sort((a, b) => b.createdAt - a.createdAt);
            } else {
                orders = global.mockOrders
                    .filter((o) => o.userEmail === email)
                    .sort((a, b) => b.createdAt - a.createdAt);
            }

            return res.status(200).json({
                EC: 0,
                EM: "Orders loaded successfully (Memory Fallback)",
                orders
            });
        }

        // DB implementation
        await autoConfirmOrders();

        const user = await User.findOne({ email });
        if (!user) {
            return res.status(404).json({ EC: 1, EM: "User not found" });
        }

        let orders;
        if (req.query.all === "true" && user.role === "ADMIN") {
            orders = await Order.find({}).sort({ createdAt: -1 });
        } else {
            orders = await Order.find({ userId: user._id }).sort({ createdAt: -1 });
        }

        return res.status(200).json({
            EC: 0,
            EM: "Orders loaded successfully",
            orders
        });
    } catch (error) {
        console.error(">>> Error at getOrders:", error);
        return res.status(500).json({ EC: -1, EM: "System error" });
    }
};

const getOrderById = async (req, res) => {
    try {
        const id = req.params.id;
        const email = req.user.email;
        const role = req.user.role;

        if (!global.dbConnected) {
            // Memory fallback
            autoConfirmMockOrders();

            const order = global.mockOrders.find((o) => o._id === id);
            if (!order) {
                return res.status(404).json({ EC: 2, EM: "Order not found (Memory Fallback)" });
            }

            if (order.userEmail !== email && role !== "ADMIN") {
                return res.status(403).json({ EC: 3, EM: "Unauthorized to access this order (Memory Fallback)" });
            }

            // Double check auto-confirm for this order specifically
            if (order.status === 1) {
                const thirtyMinsAgo = Date.now() - 30 * 60 * 1000;
                if (new Date(order.createdAt).getTime() <= thirtyMinsAgo) {
                    order.status = 2;
                    order.updatedAt = new Date();
                }
            }

            return res.status(200).json({
                EC: 0,
                EM: "Order loaded successfully (Memory Fallback)",
                order
            });
        }

        // DB implementation
        await autoConfirmOrders();

        const user = await User.findOne({ email });
        if (!user) {
            return res.status(404).json({ EC: 1, EM: "User not found" });
        }

        const order = await Order.findById(id);
        if (!order) {
            return res.status(404).json({ EC: 2, EM: "Order not found" });
        }

        if (order.userId.toString() !== user._id.toString() && user.role !== "ADMIN") {
            return res.status(403).json({ EC: 3, EM: "Unauthorized to access this order" });
        }

        if (order.status === 1) {
            const thirtyMinsAgo = new Date(Date.now() - 30 * 60 * 1000);
            if (order.createdAt <= thirtyMinsAgo) {
                order.status = 2;
                await order.save();
            }
        }

        return res.status(200).json({
            EC: 0,
            EM: "Order loaded successfully",
            order
        });
    } catch (error) {
        console.error(">>> Error at getOrderById:", error);
        return res.status(500).json({ EC: -1, EM: "System error" });
    }
};

const cancelOrder = async (req, res) => {
    try {
        const id = req.params.id;
        const { reason } = req.body;
        const email = req.user.email;

        if (!global.dbConnected) {
            // Memory fallback
            const order = global.mockOrders.find((o) => o._id === id);
            if (!order) {
                return res.status(404).json({ EC: 2, EM: "Order not found (Memory Fallback)" });
            }

            if (order.userEmail !== email) {
                return res.status(403).json({ EC: 3, EM: "Unauthorized to cancel this order (Memory Fallback)" });
            }

            const timeDiffMs = Date.now() - new Date(order.createdAt).getTime();
            const thirtyMinsMs = 30 * 60 * 1000;

            if (order.status === 3) {
                order.cancelRequested = true;
                order.cancelReason = reason || "Customer requested cancellation";
                order.updatedAt = new Date();
                return res.status(200).json({
                    EC: 0,
                    EM: "Cancellation request sent to the shop successfully (Memory Fallback)",
                    order
                });
            }

            if ((order.status === 1 || order.status === 2) && timeDiffMs < thirtyMinsMs) {
                order.status = 6;
                order.cancelReason = reason || "Customer cancelled order";
                order.updatedAt = new Date();
                return res.status(200).json({
                    EC: 0,
                    EM: "Order cancelled successfully (Memory Fallback)",
                    order
                });
            }

            return res.status(400).json({
                EC: 4,
                EM: "Order cannot be cancelled. The 30-minute cancellation window has passed, or the order is already in delivery."
            });
        }

        // DB implementation
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(404).json({ EC: 1, EM: "User not found" });
        }

        const order = await Order.findById(id);
        if (!order) {
            return res.status(404).json({ EC: 2, EM: "Order not found" });
        }

        if (order.userId.toString() !== user._id.toString()) {
            return res.status(403).json({ EC: 3, EM: "Unauthorized to cancel this order" });
        }

        const timeDiffMs = Date.now() - order.createdAt.getTime();
        const thirtyMinsMs = 30 * 60 * 1000;

        if (order.status === 3) {
            order.cancelRequested = true;
            order.cancelReason = reason || "Customer requested cancellation";
            await order.save();
            return res.status(200).json({
                EC: 0,
                EM: "Cancellation request sent to the shop successfully",
                order
            });
        }

        if ((order.status === 1 || order.status === 2) && timeDiffMs < thirtyMinsMs) {
            order.status = 6;
            order.cancelReason = reason || "Customer cancelled order";
            await order.save();
            return res.status(200).json({
                EC: 0,
                EM: "Order cancelled successfully",
                order
            });
        }

        return res.status(400).json({
            EC: 4,
            EM: "Order cannot be cancelled. The 30-minute cancellation window has passed, or the order is already in delivery."
        });
    } catch (error) {
        console.error(">>> Error at cancelOrder:", error);
        return res.status(500).json({ EC: -1, EM: "System error" });
    }
};

const updateOrderStatus = async (req, res) => {
    try {
        const id = req.params.id;
        const { status, action } = req.body;
        const email = req.user.email;
        const role = req.user.role;

        if (!global.dbConnected) {
            // Memory fallback
            if (role !== "ADMIN") {
                return res.status(403).json({ EC: 1, EM: "Only administrators can perform this action (Memory Fallback)" });
            }

            const order = global.mockOrders.find((o) => o._id === id);
            if (!order) {
                return res.status(404).json({ EC: 2, EM: "Order not found (Memory Fallback)" });
            }

            if (action === "approve-cancel") {
                order.status = 6;
                order.cancelRequested = false;
            } else if (action === "reject-cancel") {
                order.cancelRequested = false;
            } else if (status !== undefined) {
                order.status = Number(status);
                if (Number(status) === 5) {
                    order.paymentStatus = "Paid";
                }
            } else {
                return res.status(400).json({ EC: 3, EM: "Missing update details (Memory Fallback)" });
            }

            order.updatedAt = new Date();

            return res.status(200).json({
                EC: 0,
                EM: "Order updated successfully (Memory Fallback)",
                order
            });
        }

        // DB implementation
        const user = await User.findOne({ email });
        if (!user || user.role !== "ADMIN") {
            return res.status(403).json({ EC: 1, EM: "Only administrators can perform this action" });
        }

        const order = await Order.findById(id);
        if (!order) {
            return res.status(404).json({ EC: 2, EM: "Order not found" });
        }

        if (action === "approve-cancel") {
            order.status = 6;
            order.cancelRequested = false;
        } else if (action === "reject-cancel") {
            order.cancelRequested = false;
        } else if (status !== undefined) {
            order.status = Number(status);
            if (Number(status) === 5) {
                order.paymentStatus = "Paid";
            }
        } else {
            return res.status(400).json({ EC: 3, EM: "Missing update details" });
        }

        await order.save();

        return res.status(200).json({
            EC: 0,
            EM: "Order updated successfully",
            order
        });
    } catch (error) {
        console.error(">>> Error at updateOrderStatus:", error);
        return res.status(500).json({ EC: -1, EM: "System error" });
    }
};

module.exports = {
    createOrder,
    getOrders,
    getOrderById,
    cancelOrder,
    updateOrderStatus
};
