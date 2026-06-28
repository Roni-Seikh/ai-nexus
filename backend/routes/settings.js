const express = require('express');
const router = express.Router();
const aiService = require('../services/aiService');
const { protect } = require('../middleware/auth');

router.use(protect);
router.get('/models', (req, res) => {
  const models = aiService.AVAILABLE_MODELS.filter(m =>
    m.plan === 'free' || req.user.plan === m.plan || req.user.plan === 'enterprise'
  );
  res.json({ success: true, data: { models } });
});

module.exports = router;
