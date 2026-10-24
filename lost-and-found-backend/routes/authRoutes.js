const express = require("express");
const { sendOtp, verifyOtp } = require("../controllers/authController");
const asyncHandler = require("../utils/asyncHandler");

const { sendOtpLimit, verifyOtpLimit } = require("../middleware/authLimits");
const router = express.Router();

router.post("/send-otp", sendOtpLimit, asyncHandler(sendOtp));
router.post("/verify-otp", verifyOtpLimit, asyncHandler(verifyOtp));

module.exports = router;
