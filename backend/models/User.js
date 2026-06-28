const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, maxlength: 100 },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  password: { type: String, minlength: 8, select: false },
  avatar: { type: String, default: null },
  role: { type: String, enum: ['user', 'admin'], default: 'user' },
  plan: { type: String, enum: ['free', 'pro', 'enterprise'], default: 'free' },
  isEmailVerified: { type: Boolean, default: false },
  emailVerificationToken: { type: String, select: false },
  emailVerificationExpires: { type: Date, select: false },
  passwordResetToken: { type: String, select: false },
  passwordResetExpires: { type: Date, select: false },
  refreshTokens: [{ token: String, createdAt: { type: Date, default: Date.now } }],
  oauth: {
    googleId: String,
    githubId: String,
    provider: { type: String, enum: ['local', 'google', 'github'], default: 'local' },
  },
  preferences: {
    theme: { type: String, enum: ['dark', 'light', 'system'], default: 'dark' },
    defaultModel: { type: String, default: 'nexus-builtin' },
    language: { type: String, default: 'en' },
    fontSize: { type: String, enum: ['sm', 'md', 'lg'], default: 'md' },
    sendOnEnter: { type: Boolean, default: true },
  },
  apiKeys: {
    openai: { type: String, select: false },
    anthropic: { type: String, select: false },
    gemini: { type: String, select: false },
  },
  usage: {
    messagesThisMonth: { type: Number, default: 0 },
    imagesThisMonth: { type: Number, default: 0 },
    tokensThisMonth: { type: Number, default: 0 },
    lastResetDate: { type: Date, default: Date.now },
  },
  subscription: {
    stripeCustomerId: String,
    stripeSubscriptionId: String,
    currentPeriodEnd: Date,
    status: { type: String, enum: ['active', 'cancelled', 'past_due', 'trialing'], default: 'active' },
  },
  isActive: { type: Boolean, default: true },
  lastSeen: { type: Date, default: Date.now },
}, { timestamps: true });

// email index already created by unique:true on the field above
userSchema.index({ 'oauth.googleId': 1 });
userSchema.index({ 'oauth.githubId': 1 });

userSchema.pre('save', async function (next) {
  if (!this.isModified('password') || !this.password) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

userSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

userSchema.methods.toPublicJSON = function () {
  const obj = this.toObject();
  delete obj.password;
  delete obj.refreshTokens;
  delete obj.emailVerificationToken;
  delete obj.passwordResetToken;
  delete obj.apiKeys;
  return obj;
};

module.exports = mongoose.model('User', userSchema);
