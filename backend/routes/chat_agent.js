const express = require('express');
const router  = express.Router();
const { protect } = require('../middleware/auth');
const aiService = require('../services/aiService');

router.use(protect);

// Frontend AgentsPage calls POST /api/chats/agent-chat
router.post('/', async (req, res) => {
  try {
    const { messages } = req.body;
    if (!messages?.length)
      return res.status(400).json({ success:false, message:'Messages required' });

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    const onChunk = (chunk) => {
      res.write(`data: ${JSON.stringify({ type:'chunk', content:chunk })}\n\n`);
    };

    const model = req.user.preferences?.defaultModel || 'nexus-builtin';
    const result = await aiService.streamChat(messages, model, {}, onChunk);
    res.write(`data: ${JSON.stringify({ type:'done', content:result.content })}\n\n`);
    res.end();
  } catch (err) {
    res.write(`data: ${JSON.stringify({ type:'error', message:err.message })}\n\n`);
    res.end();
  }
});

module.exports = router;
