const multer = require('multer');
const path = require('path');
const fs = require('fs');
const Document = require('../models/Document');
const logger = require('../utils/logger');

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join('uploads', req.user._id.toString());
    fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `${unique}${path.extname(file.originalname)}`);
  },
});

const fileFilter = (req, file, cb) => {
  const allowed = ['application/pdf', 'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'text/plain', 'image/jpeg', 'image/png', 'image/gif', 'image/webp'];
  if (allowed.includes(file.mimetype)) cb(null, true);
  else cb(new Error('File type not supported'), false);
};

exports.upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: parseInt(process.env.MAX_FILE_SIZE) || 10 * 1024 * 1024 },
});

exports.uploadFile = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ success: false, message: 'No file uploaded' });

    const fileUrl = `/uploads/${req.user._id}/${req.file.filename}`;
    let extractedText = '';
    let type = 'other';

    if (req.file.mimetype === 'application/pdf') {
      type = 'pdf';
      try {
        const pdfParse = require('pdf-parse');
        const data = fs.readFileSync(req.file.path);
        const parsed = await pdfParse(data);
        extractedText = parsed.text.slice(0, 50000);
      } catch (e) { logger.warn('PDF parse failed:', e.message); }
    } else if (req.file.mimetype === 'text/plain') {
      type = 'txt';
      extractedText = fs.readFileSync(req.file.path, 'utf8').slice(0, 50000);
    } else if (req.file.mimetype.startsWith('image/')) {
      type = 'image';
    } else if (req.file.mimetype.includes('word')) {
      type = 'docx';
    }

    const doc = await Document.create({
      userId: req.user._id,
      chatId: req.body.chatId || null,
      name: req.file.filename,
      originalName: req.file.originalname,
      mimeType: req.file.mimetype,
      size: req.file.size,
      url: fileUrl,
      type,
      extractedText,
      isProcessed: true,
      wordCount: extractedText ? extractedText.split(/\s+/).length : 0,
    });

    res.json({ success: true, data: { document: doc } });
  } catch (err) {
    logger.error('Upload error:', err);
    res.status(500).json({ success: false, message: err.message || 'Upload failed' });
  }
};

exports.getDocuments = async (req, res) => {
  try {
    const docs = await Document.find({ userId: req.user._id }).sort({ createdAt: -1 }).limit(50).lean();
    res.json({ success: true, data: { documents: docs } });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to fetch documents' });
  }
};

exports.deleteDocument = async (req, res) => {
  try {
    const doc = await Document.findOneAndDelete({ _id: req.params.id, userId: req.user._id });
    if (doc?.url) {
      const filePath = path.join(process.cwd(), doc.url);
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    }
    res.json({ success: true, message: 'Document deleted' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to delete document' });
  }
};
