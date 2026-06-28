const express = require('express');
const router = express.Router();
const Message = require('../models/Message');
const { protect } = require('../middleware/auth');

router.use(protect);

router.patch('/:id/feedback', async (req, res) => {
  try {
    const { rating, comment } = req.body;
    const msg = await Message.findOneAndUpdate(
      { _id: req.params.id, userId: req.user._id },
      { 'feedback.rating': rating, 'feedback.comment': comment },
      { new: true }
    );
    res.json({ success: true, data: { message: msg } });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to update feedback' });
  }
});

router.patch('/:id/edit', async (req, res) => {
  try {
    const { content } = req.body;
    const msg = await Message.findOne({ _id: req.params.id, userId: req.user._id });
    if (!msg) return res.status(404).json({ success: false, message: 'Message not found' });
    msg.originalContent = msg.originalContent || msg.content;
    msg.content = content;
    msg.isEdited = true;
    msg.editedAt = new Date();
    await msg.save();
    res.json({ success: true, data: { message: msg } });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to edit message' });
  }
});

module.exports = router;
