const express = require('express');
const router = express.Router();
const User = require('../models/User');
const { protect } = require('../middleware/auth');

router.use(protect);

router.get('/profile', (req, res) => {
  res.json({ success: true, data: { user: req.user.toPublicJSON() } });
});

router.put('/profile', async (req, res) => {
  try {
    const { name, avatar, preferences } = req.body;
    const user = await User.findByIdAndUpdate(
      req.user._id,
      { $set: { name, avatar, preferences } },
      { new: true, runValidators: true }
    );
    res.json({ success: true, data: { user: user.toPublicJSON() } });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to update profile' });
  }
});

router.put('/api-keys', async (req, res) => {
  try {
    const { openai, anthropic, gemini } = req.body;
    await User.findByIdAndUpdate(req.user._id, { $set: { 'apiKeys.openai': openai, 'apiKeys.anthropic': anthropic, 'apiKeys.gemini': gemini } });
    res.json({ success: true, message: 'API keys updated' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to update API keys' });
  }
});

router.get('/usage', (req, res) => {
  res.json({ success: true, data: { usage: req.user.usage, plan: req.user.plan } });
});

module.exports = router;
