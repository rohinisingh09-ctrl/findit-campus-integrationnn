const bcrypt = require("bcryptjs");
const { randomInt } = require("node:crypto");

function generateOtp() {
  return randomInt(100000, 1000000).toString();
}

async function hashOtp(otp) {
  return bcrypt.hash(otp, 10);
}

async function compareOtp(otp, otpHash) {
  return bcrypt.compare(otp, otpHash);
}

module.exports = { generateOtp, hashOtp, compareOtp };
