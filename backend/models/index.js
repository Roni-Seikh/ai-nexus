const mongoose = require('mongoose');

// Image Generation Model
const imageSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  prompt: { type: String, required: true },
  negativePrompt: String,
  model: { type: String, default: 'pollinations-flux' },  // No enum - accepts any model
  size: { type: String, default: '1024x1024' },
  quality: { type: String, enum: ['standard', 'hd'], default: 'standard' },
  style: { type: String, enum: ['vivid', 'natural'], default: 'vivid' },
  n: { type: Number, default: 1, min: 1, max: 4 },
  urls: [String],
  revisedPrompt: String,
  status: { type: String, enum: ['pending', 'completed', 'failed'], default: 'pending' },
  error: String,
  tokens: { type: Number, default: 0 },
}, { timestamps: true });

imageSchema.index({ userId: 1, createdAt: -1 });

// Workspace Model
const workspaceSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: String,
  owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  type: { type: String, enum: ['personal', 'team'], default: 'personal' },
  members: [{
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    role: { type: String, enum: ['owner', 'admin', 'member', 'viewer'], default: 'member' },
    joinedAt: { type: Date, default: Date.now },
  }],
  settings: {
    defaultModel: String,
    systemPrompt: String,
    isPublic: { type: Boolean, default: false },
  },
  inviteCode: { type: String, unique: true, sparse: true },
  isActive: { type: Boolean, default: true },
}, { timestamps: true });

// Agent Model
const agentSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  name: { type: String, required: true },
  type: { type: String, enum: ['research', 'coding', 'writing', 'marketing', 'custom'], required: true },
  description: String,
  systemPrompt: { type: String, required: true },
  model: { type: String, default: 'nexus-builtin' },
  tools: [{ name: String, enabled: { type: Boolean, default: true } }],
  avatar: String,
  isPublic: { type: Boolean, default: false },
  usageCount: { type: Number, default: 0 },
  isActive: { type: Boolean, default: true },
}, { timestamps: true });

// Payment Model
const paymentSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  stripePaymentIntentId: String,
  stripeSubscriptionId: String,
  amount: { type: Number, required: true },
  currency: { type: String, default: 'usd' },
  status: { type: String, enum: ['pending', 'succeeded', 'failed', 'refunded'], required: true },
  plan: { type: String, enum: ['pro', 'enterprise'], required: true },
  interval: { type: String, enum: ['monthly', 'yearly'] },
  description: String,
  invoiceUrl: String,
  receiptUrl: String,
  metadata: mongoose.Schema.Types.Mixed,
}, { timestamps: true });

paymentSchema.index({ userId: 1, createdAt: -1 });

module.exports = {
  Image: mongoose.model('Image', imageSchema),
  Workspace: mongoose.model('Workspace', workspaceSchema),
  Agent: mongoose.model('Agent', agentSchema),
  Payment: mongoose.model('Payment', paymentSchema),
};
