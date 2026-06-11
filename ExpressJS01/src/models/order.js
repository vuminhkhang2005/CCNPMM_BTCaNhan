const mongoose = require("mongoose");

const orderItemSchema = new mongoose.Schema({
    productId: { type: Number, required: true },
    variantId: { type: String },
    sku: { type: String },
    slug: { type: String, required: true },
    name: { type: String, required: true },
    price: { type: Number, required: true },
    color: { type: String, required: true },
    size: { type: Number, required: true },
    quantity: { type: Number, required: true },
    image: { type: String }
});

const orderSchema = new mongoose.Schema(
    {
        userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
        customerInfo: {
            name: { type: String, required: true },
            phone: { type: String, required: true },
            address: { type: String, required: true },
            email: { type: String, required: true }
        },
        items: [orderItemSchema],
        subtotalAmount: { type: Number, default: 0 },
        discountAmount: { type: Number, default: 0 },
        couponCode: { type: String },
        couponDiscount: { type: Number, default: 0 },
        pointsUsed: { type: Number, default: 0 },
        pointsDiscount: { type: Number, default: 0 },
        totalAmount: { type: Number, required: true },
        paymentMethod: { type: String, default: "COD" }, // "COD", "MOMO", "VNPAY"
        paymentStatus: { type: String, default: "Pending" }, // "Pending", "Paid"
        status: { type: Number, default: 1 }, // 1. New, 2. Confirmed, 3. Preparing, 4. Delivering, 5. Delivered, 6. Cancelled, 7. Return processing, 8. Returned, 9. Received
        stockReleased: { type: Boolean, default: false },
        cancelRequested: { type: Boolean, default: false },
        cancelReason: { type: String },
        cancelResolution: { type: String },
        cancelResolutionNote: { type: String },
        cancelResolvedBy: { type: String },
        cancelResolvedAt: { type: Date },
        returnReason: { type: String },
        returnRequestedAt: { type: Date },
        returnResolvedBy: { type: String },
        returnResolvedAt: { type: Date },
        statusHistory: [
            {
                action: { type: String, required: true },
                fromStatus: { type: Number },
                toStatus: { type: Number },
                note: { type: String },
                actorEmail: { type: String },
                createdAt: { type: Date, default: Date.now },
            }
        ]
    },
    { timestamps: true }
);

module.exports = mongoose.model("Order", orderSchema);
