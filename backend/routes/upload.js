const express = require('express');
const router = express.Router();
const uploadController = require('../controllers/uploadController');
const { protect } = require('../middleware/auth');

router.use(protect);
router.post('/', uploadController.upload.single('file'), uploadController.uploadFile);
router.get('/documents', uploadController.getDocuments);
router.delete('/documents/:id', uploadController.deleteDocument);

module.exports = router;
