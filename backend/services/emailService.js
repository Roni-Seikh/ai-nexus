const logger = require('../utils/logger');

// ── Send via Resend API (HTTPS — works on Render free tier) ──
const sendViaResend = async ({ to, subject, html }) => {
  const { Resend } = require('resend');
  const resend = new Resend(process.env.RESEND_API_KEY);
  const { data, error } = await resend.emails.send({
    from: process.env.EMAIL_FROM || 'AI Nexus <onboarding@resend.dev>',
    to,
    subject,
    html,
  });
  if (error) throw new Error(`Resend error: ${error.message}`);
  return data;
};

// ── Send via Gmail SMTP (works on localhost) ──────────────────
const sendViaGmail = async ({ to, subject, html }) => {
  const nodemailer = require('nodemailer');
  const transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.EMAIL_PORT) || 587,
    secure: false,
    auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS },
  });
  await transporter.sendMail({
    from: process.env.EMAIL_FROM || `AI Nexus <${process.env.EMAIL_USER}>`,
    to, subject, html,
  });
};

// ── Smart send: Resend in production, Gmail in dev ───────────
const sendEmail = async (opts) => {
  const isProduction = process.env.NODE_ENV === 'production';
  const hasResend    = process.env.RESEND_API_KEY &&
                       !process.env.RESEND_API_KEY.includes('...');

  try {
    if (isProduction && hasResend) {
      // Production → use Resend API (HTTPS, Render-compatible)
      await sendViaResend(opts);
      logger.info(`✅ Email sent via Resend to ${opts.to}`);
    } else {
      // Local dev → use Gmail SMTP
      await sendViaGmail(opts);
      logger.info(`✅ Email sent via Gmail to ${opts.to}`);
    }
  } catch (err) {
    logger.error(`❌ Email failed to ${opts.to}: ${err.message}`);
    // If primary fails, try the other one
    try {
      if (isProduction && hasResend) {
        logger.info('Falling back to Gmail...');
        await sendViaGmail(opts);
      } else if (hasResend) {
        logger.info('Falling back to Resend...');
        await sendViaResend(opts);
      }
    } catch (fallbackErr) {
      logger.error(`❌ Fallback also failed: ${fallbackErr.message}`);
      throw err; // throw original error
    }
  }
};

// ── OTP email template ────────────────────────────────────────
const otpTemplate = (name, otp, type) => `
<div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;
            max-width:520px;margin:0 auto;background:#0f0f0f;
            border-radius:16px;overflow:hidden;border:1px solid #222">
  <div style="background:linear-gradient(135deg,#7c3aed,#4f46e5);padding:32px;text-align:center">
    <h1 style="color:#fff;margin:0;font-size:26px;font-weight:800">✨ AI Nexus</h1>
    <p style="color:rgba(255,255,255,0.8);margin:8px 0 0;font-size:14px">Your intelligent AI assistant</p>
  </div>
  <div style="padding:32px">
    <h2 style="color:#fff;font-size:20px;margin:0 0 8px">
      ${type === 'verify' ? 'Verify Your Email' : 'Reset Your Password'}
    </h2>
    <p style="color:#9ca3af;margin:0 0 24px;font-size:15px">
      Hello ${name || 'there'}! 
      ${type === 'verify'
        ? 'Use the OTP below to verify your email and activate your account.'
        : 'Use the OTP below to reset your password.'}
    </p>
    <div style="text-align:center;margin:28px 0">
      <div style="display:inline-block;background:#1a1a1a;border:2px dashed #7c3aed;
                  border-radius:12px;padding:16px 40px">
        <span style="font-size:36px;font-weight:800;letter-spacing:12px;
                     color:#a78bfa;font-family:monospace">${otp}</span>
      </div>
    </div>
    <div style="background:#1a1a1a;border-radius:10px;padding:14px 18px;margin-bottom:24px">
      <p style="color:#9ca3af;margin:0;font-size:13px;line-height:1.6">
        ⏱️ This OTP expires in <strong style="color:#fff">10 minutes</strong><br/>
        🔒 Never share this OTP with anyone<br/>
        🚫 If you didn't request this, ignore this email
      </p>
    </div>
    <p style="color:#6b7280;font-size:12px;text-align:center;margin:0">
      © ${new Date().getFullYear()} AI Nexus. All rights reserved.
    </p>
  </div>
</div>`;

exports.sendOTPEmail = async (email, name, otp, type = 'verify') => {
  const subject = type === 'verify'
    ? 'Your AI Nexus verification code'
    : 'Your AI Nexus password reset code';
  await sendEmail({ to: email, subject, html: otpTemplate(name, otp, type) });
};
