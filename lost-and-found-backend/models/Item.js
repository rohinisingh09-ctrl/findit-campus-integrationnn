const mongoose = require("mongoose");

const itemSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ["lost", "found"],
      required: true,
    },
    itemName: { type: String, required: true, trim: true },
    description: { type: String, required: true, trim: true },
    category: { type: String, trim: true },
    location: { type: String, trim: true }, // where it was lost / found on campus
    roomNumber: { type: String, default: "8001" }, // found items are handed in here
    reporterEmail: { type: String, required: true, lowercase: true },
    contactNumber: { type: String, trim: true },
    status: {
      type: String,
      enum: ["pending", "resolved"],
      default: "pending",
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Item", itemSchema);
