const { Image } = require('../models/index');
const imageService = require('../services/imageService');
const logger = require('../utils/logger');

exports.generateImage = async (req, res) => {
  try {
    const { prompt, model = 'pollinations-flux', size = '1024x1024', quality = 'standard', style = 'vivid', n = 1, negativePrompt } = req.body;
    if (!prompt?.trim())
      return res.status(400).json({ success: false, message: 'Prompt is required' });

    const imageDoc = await Image.create({
      userId: req.user._id, prompt, negativePrompt, model, size, quality, style, n, status: 'pending',
    });

    // Get user's OpenAI key if they have one
    let openaiKey;
    if (model.startsWith('dall-e')) {
      const User = require('../models/User');
      const u = await User.findById(req.user._id).select('+apiKeys');
      openaiKey = u?.apiKeys?.openai;
    }

    const result = await imageService.generateImage(prompt, { model, size, quality, style, n }, openaiKey);

    imageDoc.urls     = result.urls;
    imageDoc.revisedPrompt = result.revisedPrompt;
    imageDoc.status   = 'completed';
    await imageDoc.save();

    req.user.usage.imagesThisMonth += n;
    await req.user.save({ validateBeforeSave: false });

    res.json({ success: true, data: { image: imageDoc } });
  } catch (err) {
    logger.error('Image generation error:', err.message);
    res.status(500).json({ success: false, message: err.message || 'Image generation failed' });
  }
};

exports.getImages = async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const images = await Image.find({ userId: req.user._id, status: 'completed' })
      .sort({ createdAt: -1 }).skip((page-1)*limit).limit(parseInt(limit)).lean();
    const total = await Image.countDocuments({ userId: req.user._id, status: 'completed' });
    res.json({ success: true, data: { images, total, page: +page, pages: Math.ceil(total/limit) } });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to fetch images' });
  }
};

exports.deleteImage = async (req, res) => {
  try {
    await Image.findOneAndDelete({ _id: req.params.id, userId: req.user._id });
    res.json({ success: true, message: 'Image deleted' });
  } catch { res.status(500).json({ success: false, message: 'Failed to delete image' }); }
};

exports.getModels = (req, res) => {
  res.json({ success: true, data: { models: imageService.AVAILABLE_IMAGE_MODELS } });
};