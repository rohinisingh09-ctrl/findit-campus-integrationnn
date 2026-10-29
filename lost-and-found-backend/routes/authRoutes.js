const express = require("express");
const { sendOtp, verifyOtp } = require("../controllers/authController");
const asyncHandler = require("../utils/asyncHandler");
const ensureDatabase = require("../middleware/ensureDatabase");

const { sendOtpLimit, verifyOtpLimit } = require("../middleware/authLimits");
const router = express.Router();

router.post("/send-otp", sendOtpLimit, ensureDatabase, asyncHandler(sendOtp));
router.post("/verify-otp", verifyOtpLimit, ensureDatabase, asyncHandler(verifyOtp));

module.exports = router;
