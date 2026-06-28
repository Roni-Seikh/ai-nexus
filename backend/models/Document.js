const mongoose = require('mongoose');

const documentSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  chatId: { type: mongoose.Schema.Types.ObjectId, ref: 'Chat' },
  name: { type: String, required: true },
  originalName: String,
  mimeType: String,
  size: Number,
  url: String,
  type: { type: String, enum: ['pdf', 'docx', 'txt', 'image', 'other'] },
  extractedText: String,
  summary: String,
  pageCount: Number,
  wordCount: Number,
  isProcessed: { type: Boolean, default: false },
  processingError: String,
  tags: [String],
}, { timestamps: true });

documentSchema.index({ userId: 1, createdAt: -1 });

module.exports = mongoose.model('Document', documentSchema);
