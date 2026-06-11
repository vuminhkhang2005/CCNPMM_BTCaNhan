const mongoose = require("mongoose");

const productVariantSchema = new mongoose.Schema(
    {
        variantId: { type: String, required: true },
        sku: { type: String, required: true },
        color: { type: String, required: true },
        size: { type: Number, required: true },
        price: { type: Number, required: true },
        stock: { type: Number, required: true, default: 0, min: 0 },
        image: { type: String },
        images: [{ type: String }],
        isActive: { type: Boolean, default: true },
    },
    { _id: false }
);

const productSchema = new mongoose.Schema(
    {
        id: { type: Number, required: true, unique: true },
        slug: { type: String, required: true, unique: true },
        name: { type: String, required: true },
        category: { type: String, required: true },
        price: { type: Number, required: true },
        originalPrice: { type: Number },
        discount: { type: Number, default: 0 },
        promotion: { type: String },
        isNew: { type: Boolean, default: false },
        bestSeller: { type: Boolean, default: false },
        stock: { type: Number, required: true, default: 0 },
        sold: { type: Number, default: 0 },
        viewCount: { type: Number, default: 0 },
        rating: { type: Number, default: 5 },
        reviewCount: { type: Number, default: 0 },
        tags: [{ type: String }],
        colors: [{ type: String }],
        sizes: [{ type: Number }],
        images: [{ type: String }],
        variants: [productVariantSchema],
        description: { type: String },
        highlights: [{ type: String }]
    },
    { timestamps: true }
);

module.exports = mongoose.model("Product", productSchema);
