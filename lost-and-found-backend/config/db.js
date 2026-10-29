const mongoose = require("mongoose");

let connectionPromise;

async function connectDB() {
  if (mongoose.connection.readyState === 1) return mongoose.connection;

  const uri = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/lostfound";
  if (!connectionPromise) {
    connectionPromise = mongoose.connect(uri, {
      serverSelectionTimeoutMS: 10000,
    }).then(() => {
      console.log("MongoDB connected successfully");
      return mongoose.connection;
    }).catch((err) => {
      connectionPromise = null;
      throw err;
    });
  }

  return connectionPromise;
}

module.exports = connectDB;
