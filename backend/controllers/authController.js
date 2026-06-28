const jwt    = require('jsonwebtoken');
const crypto = require('crypto');
const User   = require('../models/User');
const emailService = require('../services/emailService');
const logger = require('../utils/logger');

// ── OTP store (key = email, persists in memory per session) ─
const otpStore = new Map();

const generateOTP    = () => Math.floor(100000 + Math.random() * 900000).toString();
const generateTokens = (userId) => ({
  accessToken:  jwt.sign({ id: userId }, process.env.JWT_SECRET,         { expiresIn: process.env.JWT_EXPIRES_IN  || '7d'  }),
  refreshToken: jwt.sign({ id: userId }, process.env.JWT_REFRESH_SECRET, { expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '30d' }),
});

// ─────────────────────────────────────────────────────────────
// REGISTER — Step 1: send OTP
// ─────────────────────────────────────────────────────────────
exports.sendRegisterOTP = async (req, res) => {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password)
      return res.status(400).json({ success: false, message: 'Name, email and password are required' });
    if (password.length < 8)
      return res.status(400).json({ success: false, message: 'Password must be at least 8 characters' });

    const exists = await User.findOne({ email: email.toLowerCase().trim() });
    if (exists)
      return res.status(400).json({ success: false, message: 'Email is already registered. Please log in.' });

    const otp     = generateOTP();
    const expires = Date.now() + 10 * 60 * 1000; // 10 min
    const key     = email.toLowerCase().trim();

    otpStore.set(key, { otp, expires, type: 'register', userData: { name: name.trim(), email: key, password } });
    logger.info(`[OTP] Sending register OTP to ${key}`);

    await emailService.sendOTPEmail(key, name.trim(), otp, 'verify');
    res.json({ success: true, message: `Verification OTP sent to ${email}` });
  } catch (err) {
    logger.error('sendRegisterOTP:', err.message);
    res.status(500).json({ success: false, message: 'Failed to send OTP. Check email configuration.' });
  }
};

// REGISTER — Step 2: verify OTP + create account
exports.verifyRegisterOTP = async (req, res) => {
  try {
    const { email, otp } = req.body;
    const key    = email.toLowerCase().trim();
    const record = otpStore.get(key);

    if (!record)
      return res.status(400).json({ success: false, message: 'No pending registration. Please start again.' });
    if (record.type !== 'register')
      return res.status(400).json({ success: false, message: 'Invalid OTP session type.' });
    if (Date.now() > record.expires)
      return res.status(400).json({ success: false, message: 'OTP expired. Please register again.' });
    if (record.otp !== String(otp).trim())
      return res.status(400).json({ success: false, message: 'Incorrect OTP. Please try again.' });

    otpStore.delete(key);

    const user = await User.create({
      name: record.userData.name,
      email: key,
      password: record.userData.password,
      isEmailVerified: true,
    });

    const { accessToken, refreshToken } = generateTokens(user._id);
    user.refreshTokens.push({ token: refreshToken });
    await user.save({ validateBeforeSave: false });

    res.status(201).json({
      success: true,
      message: 'Account created successfully!',
      data: { user: user.toPublicJSON(), accessToken, refreshToken },
    });
  } catch (err) {
    logger.error('verifyRegisterOTP:', err.message);
    res.status(500).json({ success: false, message: 'Account creation failed. Please try again.' });
  }
};

// RESEND OTP (both register & forgot)
exports.resendOTP = async (req, res) => {
  try {
    const { email, type } = req.body;
    const key    = email.toLowerCase().trim();
    const record = otpStore.get(key);

    if (!record)
      return res.status(400).json({ success: false, message: 'No pending request. Please start over.' });

    const otp = generateOTP();
    record.otp     = otp;
    record.expires = Date.now() + 10 * 60 * 1000;
    otpStore.set(key, record);

    const name      = record.userData?.name || 'User';
    const emailType = type === 'register' ? 'verify' : 'reset';
    await emailService.sendOTPEmail(key, name, otp, emailType);
    res.json({ success: true, message: 'New OTP sent successfully' });
  } catch (err) {
    logger.error('resendOTP:', err.message);
    res.status(500).json({ success: false, message: 'Failed to resend OTP' });
  }
};

// ─────────────────────────────────────────────────────────────
// FORGOT PASSWORD — Step 1: send OTP
// ─────────────────────────────────────────────────────────────
exports.forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    const key  = email.toLowerCase().trim();
    const user = await User.findOne({ email: key });

    if (!user)
      return res.json({ success: true, message: 'If that email exists, an OTP has been sent.' });

    const otp     = generateOTP();
    const expires = Date.now() + 10 * 60 * 1000;

    // Store with type 'forgot'
    otpStore.set(key, { otp, expires, type: 'forgot', userData: { name: user.name }, resetToken: null });
    logger.info(`[OTP] Sending forgot-password OTP to ${key}, OTP=${otp}`);

    await emailService.sendOTPEmail(key, user.name, otp, 'reset');
    res.json({ success: true, message: `OTP sent to ${email}. Valid for 10 minutes.` });
  } catch (err) {
    logger.error('forgotPassword:', err.message);
    res.status(500).json({ success: false, message: 'Failed to send OTP.' });
  }
};

// FORGOT PASSWORD — Step 2: verify OTP
exports.verifyForgotOTP = async (req, res) => {
  try {
    const { email, otp } = req.body;
    const key    = email.toLowerCase().trim();
    const record = otpStore.get(key);

    logger.info(`[OTP] Verifying forgot OTP for ${key}, submitted=${otp}, stored=${record?.otp}, type=${record?.type}`);

    if (!record)
      return res.status(400).json({ success: false, message: 'No password reset request found. Please start again.' });
    if (record.type !== 'forgot')
      return res.status(400).json({ success: false, message: 'Invalid OTP session. Please request a new OTP.' });
    if (Date.now() > record.expires)
      return res.status(400).json({ success: false, message: 'OTP has expired. Please request a new one.' });
    if (record.otp !== String(otp).trim())
      return res.status(400).json({ success: false, message: 'Incorrect OTP. Please try again.' });

    // Generate a reset token and keep record for password step
    const resetToken = crypto.randomBytes(32).toString('hex');
    record.resetToken        = resetToken;
    record.resetTokenExpires = Date.now() + 15 * 60 * 1000; // 15 min
    record.otpVerified       = true;
    otpStore.set(key, record); // keep record for password reset step

    logger.info(`[OTP] Forgot OTP verified for ${key}, resetToken issued`);
    res.json({ success: true, message: 'OTP verified!', data: { resetToken, email: key } });
  } catch (err) {
    logger.error('verifyForgotOTP:', err.message);
    res.status(500).json({ success: false, message: 'OTP verification failed.' });
  }
};

// FORGOT PASSWORD — Step 3: set new password
exports.resetPassword = async (req, res) => {
  try {
    const { email, resetToken, password } = req.body;
    const key    = email.toLowerCase().trim();
    const record = otpStore.get(key);

    logger.info(`[OTP] Reset password for ${key}, tokenMatch=${record?.resetToken === resetToken}, otpVerified=${record?.otpVerified}`);

    if (!record || !record.otpVerified)
      return res.status(400).json({ success: false, message: 'Invalid session. Please start the forgot password process again.' });
    if (!record.resetToken || record.resetToken !== resetToken)
      return res.status(400).json({ success: false, message: 'Invalid reset token. Please verify OTP again.' });
    if (Date.now() > record.resetTokenExpires)
      return res.status(400).json({ success: false, message: 'Reset session expired. Please start again.' });
    if (!password || password.length < 8)
      return res.status(400).json({ success: false, message: 'Password must be at least 8 characters.' });

    const user = await User.findOne({ email: key });
    if (!user)
      return res.status(404).json({ success: false, message: 'User not found.' });

    user.password      = password;
    user.refreshTokens = [];
    await user.save();

    otpStore.delete(key); // Clean up
    logger.info(`[OTP] Password reset successful for ${key}`);
    res.json({ success: true, message: 'Password reset successfully. Please log in with your new password.' });
  } catch (err) {
    logger.error('resetPassword:', err.message);
    res.status(500).json({ success: false, message: 'Password reset failed. Please try again.' });
  }
};

// ─────────────────────────────────────────────────────────────
// LOGIN
// ─────────────────────────────────────────────────────────────
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email: email.toLowerCase().trim() }).select('+password');
    if (!user || !user.password)
      return res.status(401).json({ success: false, message: 'Invalid email or password' });

    const ok = await user.comparePassword(password);
    if (!ok)
      return res.status(401).json({ success: false, message: 'Invalid email or password' });
    if (!user.isActive)
      return res.status(401).json({ success: false, message: 'Account deactivated. Contact support.' });

    const { accessToken, refreshToken } = generateTokens(user._id);
    user.refreshTokens = user.refreshTokens.filter(t => {
      try { jwt.verify(t.token, process.env.JWT_REFRESH_SECRET); return true; } catch { return false; }
    });
    user.refreshTokens.push({ token: refreshToken });
    user.lastSeen = new Date();
    await user.save({ validateBeforeSave: false });

    res.json({ success: true, message: 'Login successful', data: { user: user.toPublicJSON(), accessToken, refreshToken } });
  } catch (err) {
    logger.error('login:', err.message);
    res.status(500).json({ success: false, message: 'Login failed' });
  }
};

// ─────────────────────────────────────────────────────────────
// DEMO LOGIN
// ─────────────────────────────────────────────────────────────
exports.demoLogin = async (req, res) => {
  try {
    let demo = await User.findOne({ email: 'demo@ainexus.com' });
    if (!demo) {
      demo = await User.create({
        name: 'Demo User', email: 'demo@ainexus.com',
        password: 'Demo@12345678', isEmailVerified: true, plan: 'pro',
      });
    }
    const { accessToken, refreshToken } = generateTokens(demo._id);
    demo.refreshTokens = demo.refreshTokens || [];
    demo.refreshTokens.push({ token: refreshToken });
    await demo.save({ validateBeforeSave: false });
    res.json({ success: true, message: 'Demo login successful', data: { user: demo.toPublicJSON(), accessToken, refreshToken } });
  } catch (err) {
    logger.error('demoLogin:', err.message);
    res.status(500).json({ success: false, message: 'Demo login failed' });
  }
};

// ─────────────────────────────────────────────────────────────
// TOKEN REFRESH / LOGOUT / GET ME
// ─────────────────────────────────────────────────────────────
exports.refreshToken = async (req, res) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken)
      return res.status(401).json({ success: false, message: 'Refresh token required' });
    const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
    const user    = await User.findById(decoded.id);
    if (!user || !user.refreshTokens.some(t => t.token === refreshToken))
      return res.status(401).json({ success: false, message: 'Invalid refresh token' });
    const { accessToken, refreshToken: newRT } = generateTokens(user._id);
    user.refreshTokens = user.refreshTokens.filter(t => t.token !== refreshToken);
    user.refreshTokens.push({ token: newRT });
    await user.save({ validateBeforeSave: false });
    res.json({ success: true, data: { accessToken, refreshToken: newRT } });
  } catch {
    res.status(401).json({ success: false, message: 'Invalid or expired refresh token' });
  }
};

exports.logout = async (req, res) => {
  try {
    const { refreshToken } = req.body;
    if (refreshToken) {
      req.user.refreshTokens = req.user.refreshTokens.filter(t => t.token !== refreshToken);
      await req.user.save({ validateBeforeSave: false });
    }
    res.json({ success: true, message: 'Logged out' });
  } catch { res.status(500).json({ success: false, message: 'Logout failed' }); }
};

exports.getMe    = (req, res) => res.json({ success: true, data: { user: req.user.toPublicJSON() } });
exports.verifyEmail = (req, res) => res.json({ success: true, message: 'Email verified via OTP' });