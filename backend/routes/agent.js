const express    = require('express');
const router     = express.Router();
const { Agent }  = require('../models/index');
const { protect }= require('../middleware/auth');
const aiService  = require('../services/aiService');
const logger     = require('../utils/logger');

router.use(protect);

const DEFAULT_AGENTS = [
  { type:'research',  name:'Research Agent',  description:'Deep research on any topic',      systemPrompt:'You are an expert research assistant.', avatar:'🔬' },
  { type:'coding',    name:'Coding Agent',    description:'Code generation and review',       systemPrompt:'You are an expert software engineer.',  avatar:'💻' },
  { type:'writing',   name:'Writing Agent',   description:'Content creation and editing',     systemPrompt:'You are a professional writer.',         avatar:'✍️' },
  { type:'marketing', name:'Marketing Agent', description:'Marketing and growth strategies',  systemPrompt:'You are a marketing expert.',            avatar:'📈' },
];

// GET all agents
router.get('/', async (req, res) => {
  try {
    const userAgents = await Agent.find({ $or:[{userId:req.user._id},{isPublic:true}] }).lean();
    const defaults   = DEFAULT_AGENTS.map(a => ({ ...a, isDefault:true, id:a.type }));
    res.json({ success:true, data:{ agents:[...defaults,...userAgents] } });
  } catch (err) {
    res.status(500).json({ success:false, message:'Failed to fetch agents' });
  }
});

// POST /api/agents/chat  ← this is what the frontend calls
router.post('/chat', async (req, res) => {
  try {
    const { messages } = req.body;
    if (!Array.isArray(messages) || messages.length === 0)
      return res.status(400).json({ success:false, message:'messages array required' });

    logger.debug(`[Agent chat] user=${req.user._id} messages=${messages.length}`);

    res.setHeader('Content-Type',  'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection',    'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');

    const model   = req.user.preferences?.defaultModel || 'nexus-builtin';
    const onChunk = (chunk) => {
      try { res.write(`data: ${JSON.stringify({ type:'chunk', content:chunk })}\n\n`); } catch {}
    };

    const result = await aiService.streamChat(messages, model, { maxTokens:3000 }, onChunk);
    res.write(`data: ${JSON.stringify({ type:'done', content:result.content })}\n\n`);
    res.end();
  } catch (err) {
    logger.error('Agent chat error:', err.message);
    try {
      res.write(`data: ${JSON.stringify({ type:'error', message:err.message })}\n\n`);
      res.end();
    } catch {}
  }
});

// POST create custom agent
router.post('/', async (req, res) => {
  try {
    const agent = await Agent.create({ ...req.body, userId:req.user._id });
    res.status(201).json({ success:true, data:{ agent } });
  } catch (err) {
    res.status(500).json({ success:false, message:'Failed to create agent' });
  }
});

// DELETE agent
router.delete('/:id', async (req, res) => {
  try {
    await Agent.findOneAndDelete({ _id:req.params.id, userId:req.user._id });
    res.json({ success:true, message:'Deleted' });
  } catch (err) {
    res.status(500).json({ success:false, message:'Failed to delete agent' });
  }
});

module.exports = router;