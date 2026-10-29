require("dotenv").config();
const express = require("express");
const cors = require("cors");
const path = require("node:path");
const connectDB = require("./config/db");
const authRoutes = require("./routes/authRoutes");
const itemRoutes = require("./routes/itemRoutes");

const app = express();

app.disable("x-powered-by");
const allowedOrigins = (process.env.CORS_ORIGINS || "").split(",").map(value => value.trim()).filter(Boolean);
app.use(cors({ origin: allowedOrigins }));
app.use(express.json());

app.get("/api/health", (req, res) => res.json({ status: "ok" }));

app.use("/api/auth", authRoutes);
app.use("/api/items", itemRoutes);
app.use(express.static(path.join(__dirname, "../findit-campus-frontend")));

// basic error handler (catches thrown/rejected errors from async route handlers)
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ message: "Something went wrong" });
});

const PORT = process.env.PORT || 5000;

if (require.main === module) {
  const expiry = Number(process.env.OTP_EXPIRY_MINUTES || 5);
  if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32 || !Number.isFinite(expiry) || expiry <= 0) {
    throw new Error("Set JWT_SECRET to at least 32 characters and OTP_EXPIRY_MINUTES to a positive number.");
  }
  connectDB().then(() => {
    app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
  }).catch((err) => {
    console.error("MongoDB connection error:", err.message);
    process.exit(1);
  });
}
module.exports = app;
