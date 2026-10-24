const jwt = require("jsonwebtoken");
const User = require("../models/User");
const { generateOtp, hashOtp, compareOtp } = require("../utils/otp");
const { sendOtpEmail } = require("../utils/mailer");

function normalizeEmail(value) {
  const domain = (process.env.COLLEGE_EMAIL_DOMAIN || "@sru.edu.in").toLowerCase();
  if (typeof value !== "string" || value.length > 254) return null;
  const email = value.trim().toLowerCase();
  return /^[a-z0-9.!#$%&'*+\/=?^_`{|}~-]+@[a-z0-9.-]+$/.test(email) &&
    email.slice(email.indexOf("@")) === domain ? email : null;
}

async function sendOtp(req, res) {
  const email = normalizeEmail(req.body?.email);
  if (!email) return res.status(400).json({ message: "Please enter a valid college email." });
  // Ensure a record exists, then atomically reserve the account's resend window.
  try {
    await User.updateOne({ email }, { $setOnInsert: { email } }, { upsert: true });
  } catch (error) {
    if (error.code !== 11000) throw error;
  }
  const now = new Date();
  const otp = generateOtp();
  const otpHash = await hashOtp(otp);
  const user = await User.findOneAndUpdate({
    email,
    $or: [{ otpLastSentAt: null }, { otpLastSentAt: { $lte: new Date(now - 60000) } }],
  }, { $set: {
    otpHash, otpAttempts: 0, otpLastSentAt: now,
    otpExpiresAt: new Date(now.getTime() + Number(process.env.OTP_EXPIRY_MINUTES || 5) * 60000),
  } }, { new: true });
  if (!user) return res.status(429).json({ message: "Please wait 60 seconds before requesting another OTP." });
  try {
    await sendOtpEmail(email, otp);
  } catch (error) {
    // Do not clear a newer request if delivery was slow.
    await User.updateOne({ email, otpHash }, { $set: { otpHash: null, otpExpiresAt: null } });
    return res.status(503).json({ message: "Could not send OTP email. Please try again later." });
  }
  return res.status(200).json({ message: "OTP sent to your college email" });
}

async function verifyOtp(req, res) {
  const email = normalizeEmail(req.body?.email);
  const otp = req.body?.otp;
  if (!email || typeof otp !== "string" || !/^\d{6}$/.test(otp)) {
    return res.status(400).json({ message: "A valid college email and six-digit OTP are required." });
  }
  // Reserve an attempt before expensive comparison, including concurrent requests.
  const user = await User.findOneAndUpdate({
    email, otpHash: { $ne: null }, otpExpiresAt: { $gt: new Date() },
    $or: [{ otpAttempts: { $lt: 5 } }, { otpAttempts: { $exists: false } }],
  }, { $inc: { otpAttempts: 1 } }, { new: true });
  const invalid = () => res.status(400).json({ message: "Invalid, expired or exhausted OTP. Request a new one if needed." });
  if (!user || !(await compareOtp(otp, user.otpHash))) return invalid();
  const token = jwt.sign({ email }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || "7d" });
  // Only one concurrent verification may consume this exact code.
  const consumed = await User.updateOne({ _id: user._id, otpHash: user.otpHash, otpExpiresAt: { $gt: new Date() } },
    { $set: { isVerified: true, otpHash: null, otpExpiresAt: null } });
  if (consumed.modifiedCount !== 1) return invalid();
  return res.status(200).json({ message: "Login successful", token });
}

module.exports = { sendOtp, verifyOtp, normalizeEmail };
