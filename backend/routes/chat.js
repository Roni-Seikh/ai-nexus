const express = require('express');
const router = express.Router();
const chatController = require('../controllers/chatController');
const { protect } = require('../middleware/auth');

router.use(protect);
router.get('/', chatController.getChats);
router.post('/', chatController.createChat);
router.get('/shared/:token', chatController.getSharedChat);
router.get('/:id', chatController.getChat);
router.put('/:id', chatController.updateChat);
router.delete('/:id', chatController.deleteChat);
router.get('/:id/messages', chatController.getMessages);
router.post('/:id/messages', chatController.sendMessage);
router.post('/:id/share', chatController.shareChat);

module.exports = router;
