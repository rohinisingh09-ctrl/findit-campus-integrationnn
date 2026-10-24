const { rateLimit } = require("express-rate-limit");
// Per-process IP protection; account cooldown/attempt caps are persisted in MongoDB.
const options = { windowMs: 15 * 60 * 1000, standardHeaders: "draft-8", legacyHeaders: false,
  message: { message: "Too many authentication requests. Please try again later." } };
module.exports = {
  sendOtpLimit: rateLimit({ ...options, limit: 10 }),
  verifyOtpLimit: rateLimit({ ...options, limit: 30 }),
};
