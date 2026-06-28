const express = require('express');
const router = express.Router();
const imageController = require('../controllers/imageController');
const { protect } = require('../middleware/auth');

router.use(protect);
router.post('/generate', imageController.generateImage);
router.get('/', imageController.getImages);
router.delete('/:id', imageController.deleteImage);

module.exports = router;
