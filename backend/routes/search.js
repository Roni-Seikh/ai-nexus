const express = require('express');
const router = express.Router();
const searchService = require('../services/searchService');
const { protect } = require('../middleware/auth');

router.use(protect);
router.post('/', async (req, res) => {
  try {
    const { query, maxResults } = req.body;
    if (!query) return res.status(400).json({ success: false, message: 'Query required' });
    const results = await searchService.search(query, { maxResults });
    res.json({ success: true, data: { results } });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Search failed' });
  }
});

module.exports = router;
