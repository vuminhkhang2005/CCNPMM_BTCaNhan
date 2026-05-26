const mongoose = require("mongoose");

const connection = async () => {
    const uri = process.env.MONGO_DB_URL || process.env.MONGODB_URI || process.env.DB_HOST;

    if (!uri) {
        console.log("MongoDB connection string is missing. API will still serve static product data.");
        return;
    }

    await mongoose.connect(uri);
    console.log("Connected to database");
};

module.exports = connection;
