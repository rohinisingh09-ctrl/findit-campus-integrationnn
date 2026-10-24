const mongoose = require("mongoose");

async function connectDB() {
  try {
    const uri = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/lostfound";
    await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 5000,
    });
    console.log("MongoDB connected successfully");
  } catch (err) {
    console.error("MongoDB connection error:", err.message);
    console.error("Note: If using MongoDB Atlas, ensure Network Access whitelist allows your IP (0.0.0.0/0 in Atlas Network Access).");
    process.exit(1);
  }
}

module.exports = connectDB;
