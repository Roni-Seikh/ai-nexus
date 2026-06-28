const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  chatId: { type: mongoose.Schema.Types.ObjectId, ref: 'Chat', required: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  role: { type: String, enum: ['user', 'assistant', 'system'], required: true },
  content: { type: String, required: true },
  model: { type: String },
  tokens: {
    prompt: { type: Number, default: 0 },
    completion: { type: Number, default: 0 },
    total: { type: Number, default: 0 },
  },
  attachments: [{
    type: { type: String, enum: ['image', 'pdf', 'docx', 'txt'] },
    name: String,
    url: String,
    size: Number,
    extractedText: String,
  }],
  webSearchResults: [{
    title: String,
    url: String,
    snippet: String,
    score: Number,
  }],
  isEdited: { type: Boolean, default: false },
  editedAt: Date,
  originalContent: String,
  isStreaming: { type: Boolean, default: false },
  streamCompleted: { type: Boolean, default: true },
  feedback: {
    rating: { type: String, enum: ['thumbs_up', 'thumbs_down', null], default: null },
    comment: String,
  },
  metadata: {
    generationTime: Number,
    finishReason: String,
    temperature: Number,
  },
}, { timestamps: true });

messageSchema.index({ chatId: 1, createdAt: 1 });
messageSchema.index({ userId: 1, createdAt: -1 });

module.exports = mongoose.model('Message', messageSchema);
