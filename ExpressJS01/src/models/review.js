const mongoose = require("mongoose");

const reviewSchema = new mongoose.Schema(
    {
        userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
        userEmail: { type: String, required: true },
        userName: { type: String },
        productId: { type: Number, required: true },
        productSlug: { type: String, required: true },
        productName: { type: String },
        orderId: { type: mongoose.Schema.Types.Mixed, required: true },
        rating: { type: Number, required: true, min: 1, max: 5 },
        comment: { type: String, required: true },
        rewardPoints: { type: Number, default: 0 },
        rewardCouponCode: { type: String },
    },
    { timestamps: true },
);

reviewSchema.index({ userEmail: 1, productId: 1, orderId: 1 }, { unique: true });

module.exports = mongoose.model("Review", reviewSchema);
