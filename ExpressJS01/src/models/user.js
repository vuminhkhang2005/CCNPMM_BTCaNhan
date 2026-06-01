const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
    {
        name: String,
        email: { type: String, unique: true },
        password: String,
        role: { type: String, default: "USER" },
        points: { type: Number, default: 0 },
        favoriteProducts: [{ type: Number }],
        viewedProducts: [{
            productId: { type: Number, required: true },
            slug: { type: String, required: true },
            viewedAt: { type: Date, default: Date.now }
        }],
        passwordResetToken: String,
        passwordResetExpires: Date,
    },
    { timestamps: true },
);

module.exports = mongoose.model("User", userSchema);
