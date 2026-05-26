const mongoose = require("mongoose");

const orderItemSchema = new mongoose.Schema({
    productId: { type: Number, required: true },
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
        totalAmount: { type: Number, required: true },
        paymentMethod: { type: String, default: "COD" }, // "COD", "MOMO", "VNPAY"
        paymentStatus: { type: String, default: "Pending" }, // "Pending", "Paid"
        status: { type: Number, default: 1 }, // 1. New, 2. Confirmed, 3. Preparing, 4. Delivering, 5. Delivered, 6. Cancelled
        cancelRequested: { type: Boolean, default: false },
        cancelReason: { type: String }
    },
    { timestamps: true }
);

module.exports = mongoose.model("Order", orderSchema);
