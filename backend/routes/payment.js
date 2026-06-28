const express = require('express');
const router = express.Router();
const paymentController = require('../controllers/paymentController');
const { protect } = require('../middleware/auth');

router.post('/webhook', express.raw({ type: 'application/json' }), paymentController.handleWebhook);
router.use(protect);
router.post('/checkout', paymentController.createCheckoutSession);
router.get('/subscription', paymentController.getSubscription);
router.post('/cancel', paymentController.cancelSubscription);

module.exports = router;
