const mongoose = require('mongoose');

const chatSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  workspaceId: { type: mongoose.Schema.Types.ObjectId, ref: 'Workspace', default: null },
  title: { type: String, default: 'New Chat', maxlength: 200 },
  model: { type: String, default: 'gpt-4o' },
  systemPrompt: { type: String, default: '' },
  isPinned: { type: Boolean, default: false },
  isArchived: { type: Boolean, default: false },
  isShared: { type: Boolean, default: false },
  shareToken: { type: String, unique: true, sparse: true },
  tags: [{ type: String }],
  messageCount: { type: Number, default: 0 },
  totalTokens: { type: Number, default: 0 },
  lastMessageAt: { type: Date, default: Date.now },
  metadata: {
    hasImages: { type: Boolean, default: false },
    hasFiles: { type: Boolean, default: false },
    hasWebSearch: { type: Boolean, default: false },
  },
}, { timestamps: true });

chatSchema.index({ userId: 1, createdAt: -1 });
chatSchema.index({ userId: 1, isPinned: -1, lastMessageAt: -1 });
chatSchema.index({ userId: 1, isArchived: 1 });
chatSchema.index({ title: 'text' });

module.exports = mongoose.model('Chat', chatSchema);
