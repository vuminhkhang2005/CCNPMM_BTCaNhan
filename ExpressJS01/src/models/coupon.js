const mongoose = require("mongoose");

const couponSchema = new mongoose.Schema(
    {
        code: { type: String, required: true, unique: true, uppercase: true, trim: true },
        title: { type: String, required: true },
        description: { type: String },
        type: { type: String, enum: ["PERCENT", "FIXED"], required: true },
        value: { type: Number, required: true },
        minOrderAmount: { type: Number, default: 0 },
        maxDiscount: { type: Number, default: 0 },
        active: { type: Boolean, default: true },
        usageLimit: { type: Number, default: 0 },
        usedCount: { type: Number, default: 0 },
        ownerEmail: { type: String, default: "" },
        source: { type: String, default: "PROMOTION" },
        expiresAt: { type: Date },
    },
    { timestamps: true },
);

module.exports = mongoose.model("Coupon", couponSchema);
