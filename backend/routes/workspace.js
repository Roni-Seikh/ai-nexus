const express = require('express');
const router = express.Router();
const { Workspace } = require('../models/index');
const { protect } = require('../middleware/auth');
const { v4: uuidv4 } = require('uuid');

router.use(protect);

router.get('/', async (req, res) => {
  try {
    const workspaces = await Workspace.find({ 'members.user': req.user._id }).populate('members.user', 'name avatar').lean();
    res.json({ success: true, data: { workspaces } });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to fetch workspaces' });
  }
});

router.post('/', async (req, res) => {
  try {
    const { name, description, type } = req.body;
    const workspace = await Workspace.create({
      name, description, type,
      owner: req.user._id,
      members: [{ user: req.user._id, role: 'owner' }],
      inviteCode: uuidv4(),
    });
    res.status(201).json({ success: true, data: { workspace } });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to create workspace' });
  }
});

router.post('/join/:inviteCode', async (req, res) => {
  try {
    const workspace = await Workspace.findOne({ inviteCode: req.params.inviteCode, isActive: true });
    if (!workspace) return res.status(404).json({ success: false, message: 'Invalid invite code' });
    const isMember = workspace.members.some(m => m.user.toString() === req.user._id.toString());
    if (!isMember) workspace.members.push({ user: req.user._id, role: 'member' });
    await workspace.save();
    res.json({ success: true, data: { workspace } });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to join workspace' });
  }
});

module.exports = router;
