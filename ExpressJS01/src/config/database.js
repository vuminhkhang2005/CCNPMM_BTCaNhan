const mongoose = require("mongoose");
const seedData = require("./seed");

global.dbConnected = false;

const connection = async () => {
    const uri = process.env.MONGO_DB_URL || process.env.MONGODB_URI || process.env.DB_HOST;

    if (!uri) {
        console.log("MongoDB connection string is missing. API will fall back to in-memory mock data.");
        global.dbConnected = false;
        return;
    }

    try {
        await mongoose.connect(uri, {
            serverSelectionTimeoutMS: 3000 // 3 seconds timeout
        });
        console.log("Connected to database successfully.");
        global.dbConnected = true;
        await seedData();
    } catch (error) {
        console.log(">>> Database connection failed. API will fall back to in-memory mock data. Error:", error.message);
        global.dbConnected = false;
    }
};

module.exports = connection;


