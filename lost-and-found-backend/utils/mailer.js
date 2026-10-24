const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT),
  secure: Number(process.env.SMTP_PORT) === 465,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

async function sendOtpEmail(toEmail, otp) {
  await transporter.sendMail({
    from: process.env.SMTP_FROM,
    to: toEmail,
    subject: "Your Campus Lost & Found OTP",
    text: `Your OTP is ${otp}. It expires in ${process.env.OTP_EXPIRY_MINUTES || 5} minutes.`,
    html: `<p>Your OTP is <b>${otp}</b>.</p><p>It expires in ${process.env.OTP_EXPIRY_MINUTES || 5} minutes.</p>`,
  });
}

module.exports = { sendOtpEmail };
