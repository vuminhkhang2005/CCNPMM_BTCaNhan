const mongoose = require("mongoose");

const cartItemSchema = new mongoose.Schema({
    productId: { type: Number, required: true },
    slug: { type: String, required: true },
    name: { type: String, required: true },
    price: { type: Number, required: true },
    color: { type: String, required: true },
    size: { type: Number, required: true },
    quantity: { type: Number, required: true, default: 1 },
    image: { type: String }
});

const cartSchema = new mongoose.Schema(
    {
        userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, unique: true },
        items: [cartItemSchema]
    },
    { timestamps: true }
);

module.exports = mongoose.model("Cart", cartSchema);
