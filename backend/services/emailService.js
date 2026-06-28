const nodemailer = require('nodemailer');
const logger = require('../utils/logger');

const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.EMAIL_PORT) || 587,
  secure: false,
  auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS },
});

const sendEmail = async ({ to, subject, html }) => {
  try {
    await transporter.sendMail({ from: process.env.EMAIL_FROM || 'AI Nexus <noreply@ainexus.com>', to, subject, html });
    logger.info(`✉️ Email sent to ${to}: ${subject}`);
  } catch (err) {
    logger.error(`❌ Email failed to ${to}:`, err.message);
    throw err;
  }
};

const OTP_STYLE = `
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  max-width: 520px; margin: 0 auto; background: #0f0f0f;
  border-radius: 16px; overflow: hidden; border: 1px solid #222;
`;
const otpBox = (otp) => `
  <div style="text-align:center; margin: 28px 0;">
    <div style="display:inline-block; background:#1a1a1a; border:2px dashed #7c3aed;
      border-radius:12px; padding:16px 40px;">
      <span style="font-size:36px; font-weight:800; letter-spacing:12px;
        color:#a78bfa; font-family:monospace;">${otp}</span>
    </div>
  </div>
`;

exports.sendOTPEmail = async (email, name, otp, type = 'verify') => {
  const isVerify = type === 'verify';
  const subject  = isVerify ? 'Verify your AI Nexus account' : 'Reset your AI Nexus password';
  const title    = isVerify ? 'Verify Your Email' : 'Reset Your Password';
  const desc     = isVerify
    ? 'Use the OTP below to verify your email and activate your account.'
    : 'Use the OTP below to reset your password.';

  await sendEmail({
    to: email,
    subject,
    html: `
    <div style="${OTP_STYLE}">
      <!-- Header -->
      <div style="background:linear-gradient(135deg,#7c3aed,#4f46e5); padding:32px; text-align:center;">
        <h1 style="color:#fff; margin:0; font-size:26px; font-weight:800;">✨ AI Nexus</h1>
      </div>

      <!-- Body -->
      <div style="padding:32px;">
        <h2 style="color:#fff; font-size:20px; margin:0 0 8px 0;">${title}</h2>
        <p style="color:#9ca3af; margin:0 0 24px 0;">Hello ${name || 'there'}, ${desc}</p>

        ${otpBox(otp)}

        <div style="background:#1a1a1a; border-radius:10px; padding:14px 18px; margin-bottom:24px;">
          <p style="color:#9ca3af; margin:0; font-size:13px;">
            ⏱️ This OTP expires in <strong style="color:#fff;">10 minutes</strong><br/>
            🔒 Never share this OTP with anyone<br/>
            🚫 If you didn't request this, ignore this email
          </p>
        </div>

        <p style="color:#6b7280; font-size:12px; text-align:center; margin:0;">
          © ${new Date().getFullYear()} AI Nexus. All rights reserved.
        </p>
      </div>
    </div>`,
  });
};
