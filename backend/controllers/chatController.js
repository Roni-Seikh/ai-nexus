const Chat = require('../models/Chat');
const Message = require('../models/Message');
const aiService = require('../services/aiService');
const searchService = require('../services/searchService');
const logger = require('../utils/logger');
const { v4: uuidv4 } = require('uuid');

exports.getChats = async (req, res) => {
  try {
    const { page = 1, limit = 50, search, archived = false } = req.query;
    const query = { userId: req.user._id, isArchived: archived === 'true' };
    if (search) query.$text = { $search: search };
    const chats = await Chat.find(query)
      .sort({ isPinned: -1, lastMessageAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit))
      .lean();
    res.json({ success: true, data: { chats } });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to fetch chats' });
  }
};

exports.createChat = async (req, res) => {
  try {
    const { title, model, systemPrompt, workspaceId } = req.body;
    const chat = await Chat.create({
      userId: req.user._id,
      title: title || 'New Chat',
      model: model || req.user.preferences?.defaultModel || 'claude-3-haiku-20240307',
      systemPrompt: systemPrompt || '',
      workspaceId: workspaceId || null,
    });
    res.status(201).json({ success: true, data: { chat } });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to create chat' });
  }
};

exports.getChat = async (req, res) => {
  try {
    const chat = await Chat.findOne({ _id: req.params.id, userId: req.user._id });
    if (!chat) return res.status(404).json({ success: false, message: 'Chat not found' });
    res.json({ success: true, data: { chat } });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to fetch chat' });
  }
};

exports.updateChat = async (req, res) => {
  try {
    const { title, model, systemPrompt, isPinned, isArchived } = req.body;
    const chat = await Chat.findOneAndUpdate(
      { _id: req.params.id, userId: req.user._id },
      { $set: { title, model, systemPrompt, isPinned, isArchived } },
      { new: true, runValidators: true }
    );
    if (!chat) return res.status(404).json({ success: false, message: 'Chat not found' });
    res.json({ success: true, data: { chat } });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to update chat' });
  }
};

exports.deleteChat = async (req, res) => {
  try {
    const chat = await Chat.findOneAndDelete({ _id: req.params.id, userId: req.user._id });
    if (!chat) return res.status(404).json({ success: false, message: 'Chat not found' });
    await Message.deleteMany({ chatId: req.params.id });
    res.json({ success: true, message: 'Chat deleted' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to delete chat' });
  }
};

exports.getMessages = async (req, res) => {
  try {
    const chat = await Chat.findOne({ _id: req.params.id, userId: req.user._id });
    if (!chat) return res.status(404).json({ success: false, message: 'Chat not found' });
    const { page = 1, limit = 50 } = req.query;
    const messages = await Message.find({ chatId: req.params.id })
      .sort({ createdAt: 1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit))
      .lean();
    res.json({ success: true, data: { messages, chat } });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to fetch messages' });
  }
};

exports.sendMessage = async (req, res) => {
  try {
    const { content, model, webSearch = false, temperature, maxTokens } = req.body;
    const chat = await Chat.findOne({ _id: req.params.id, userId: req.user._id });
    if (!chat) return res.status(404).json({ success: false, message: 'Chat not found' });

    // Save user message
    const userMessage = await Message.create({
      chatId: chat._id,
      userId: req.user._id,
      role: 'user',
      content,
    });

    // Get conversation history
    const history = await Message.find({ chatId: chat._id })
      .sort({ createdAt: 1 })
      .limit(20)
      .lean();

    let searchResults = [];
    let searchContext = '';
    if (webSearch) {
      try {
        searchResults = await searchService.search(content);
        searchContext = searchResults.map((r, i) => `[${i + 1}] ${r.title}\n${r.snippet}\nSource: ${r.url}`).join('\n\n');
      } catch (e) {
        logger.warn('Web search failed:', e.message);
      }
    }

    const systemPrompt = [
      chat.systemPrompt || 'You are a helpful AI assistant.',
      searchContext ? `\n\nWeb search results:\n${searchContext}\n\nCite sources using [1], [2] etc.` : '',
    ].filter(Boolean).join('');

    const messages = [
      ...(systemPrompt ? [{ role: 'system', content: systemPrompt }] : []),
      ...history.map(m => ({ role: m.role, content: m.content })),
    ];

    const activeModel = model || chat.model || 'gpt-4o';

    // Stream response
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    let fullContent = '';
    const onChunk = (chunk) => {
      fullContent += chunk;
      res.write(`data: ${JSON.stringify({ type: 'chunk', content: chunk })}\n\n`);
    };

    const startTime = Date.now();
    const result = await aiService.streamChat(messages, activeModel, { temperature, maxTokens }, onChunk);
    const generationTime = Date.now() - startTime;

    // Save assistant message
    const assistantMessage = await Message.create({
      chatId: chat._id,
      userId: req.user._id,
      role: 'assistant',
      content: result.content,
      model: activeModel,
      tokens: result.tokens,
      webSearchResults: searchResults.slice(0, 5),
      metadata: { generationTime, finishReason: 'stop' },
    });

    // Update chat
    const isFirstMessage = history.length <= 1;
    if (isFirstMessage && chat.title === 'New Chat') {
      const title = await aiService.generateTitle(content);
      await Chat.findByIdAndUpdate(chat._id, { title, lastMessageAt: new Date(), $inc: { messageCount: 2, totalTokens: result.tokens.total } });
    } else {
      await Chat.findByIdAndUpdate(chat._id, { lastMessageAt: new Date(), $inc: { messageCount: 2, totalTokens: result.tokens.total } });
    }

    // Update user usage
    req.user.usage.messagesThisMonth += 1;
    req.user.usage.tokensThisMonth += result.tokens.total;
    await req.user.save({ validateBeforeSave: false });

    res.write(`data: ${JSON.stringify({ type: 'done', message: assistantMessage, tokens: result.tokens })}\n\n`);
    res.end();
  } catch (err) {
    logger.error('Send message error:', err);
    res.write(`data: ${JSON.stringify({ type: 'error', message: err.message })}\n\n`);
    res.end();
  }
};

exports.shareChat = async (req, res) => {
  try {
    const chat = await Chat.findOne({ _id: req.params.id, userId: req.user._id });
    if (!chat) return res.status(404).json({ success: false, message: 'Chat not found' });
    if (!chat.shareToken) chat.shareToken = uuidv4();
    chat.isShared = true;
    await chat.save();
    res.json({ success: true, data: { shareToken: chat.shareToken, shareUrl: `${process.env.CLIENT_URL}/share/${chat.shareToken}` } });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to share chat' });
  }
};

exports.getSharedChat = async (req, res) => {
  try {
    const chat = await Chat.findOne({ shareToken: req.params.token, isShared: true });
    if (!chat) return res.status(404).json({ success: false, message: 'Shared chat not found' });
    const messages = await Message.find({ chatId: chat._id }).sort({ createdAt: 1 }).lean();
    res.json({ success: true, data: { chat, messages } });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to fetch shared chat' });
  }
};
