const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const User = require('../models/User');
const { Payment } = require('../models/index');
const logger = require('../utils/logger');

const PLANS = {
  pro: { priceId: process.env.STRIPE_PRO_PRICE_ID, name: 'Pro' },
  enterprise: { priceId: process.env.STRIPE_ENTERPRISE_PRICE_ID, name: 'Enterprise' },
};

exports.createCheckoutSession = async (req, res) => {
  try {
    const { plan } = req.body;
    if (!PLANS[plan]) return res.status(400).json({ success: false, message: 'Invalid plan' });

    let customerId = req.user.subscription?.stripeCustomerId;
    if (!customerId) {
      const customer = await stripe.customers.create({ email: req.user.email, name: req.user.name, metadata: { userId: req.user._id.toString() } });
      customerId = customer.id;
      await User.findByIdAndUpdate(req.user._id, { 'subscription.stripeCustomerId': customerId });
    }

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      payment_method_types: ['card'],
      mode: 'subscription',
      line_items: [{ price: PLANS[plan].priceId, quantity: 1 }],
      success_url: `${process.env.CLIENT_URL}/settings?payment=success&plan=${plan}`,
      cancel_url: `${process.env.CLIENT_URL}/pricing?payment=cancelled`,
      metadata: { userId: req.user._id.toString(), plan },
    });

    res.json({ success: true, data: { sessionUrl: session.url, sessionId: session.id } });
  } catch (err) {
    logger.error('Stripe checkout error:', err);
    res.status(500).json({ success: false, message: 'Failed to create checkout session' });
  }
};

exports.handleWebhook = async (req, res) => {
  const sig = req.headers['stripe-signature'];
  let event;
  try {
    event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    return res.status(400).json({ success: false, message: `Webhook error: ${err.message}` });
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object;
        const userId = session.metadata.userId;
        const plan = session.metadata.plan;
        const subscription = await stripe.subscriptions.retrieve(session.subscription);
        await User.findByIdAndUpdate(userId, {
          plan,
          'subscription.stripeSubscriptionId': subscription.id,
          'subscription.currentPeriodEnd': new Date(subscription.current_period_end * 1000),
          'subscription.status': 'active',
        });
        await Payment.create({
          userId,
          stripePaymentIntentId: session.payment_intent,
          stripeSubscriptionId: subscription.id,
          amount: session.amount_total / 100,
          currency: session.currency,
          status: 'succeeded',
          plan,
          interval: subscription.items.data[0]?.plan?.interval === 'year' ? 'yearly' : 'monthly',
        });
        break;
      }
      case 'customer.subscription.deleted': {
        const sub = event.data.object;
        await User.findOneAndUpdate({ 'subscription.stripeSubscriptionId': sub.id }, { plan: 'free', 'subscription.status': 'cancelled' });
        break;
      }
      case 'invoice.payment_failed': {
        const invoice = event.data.object;
        await User.findOneAndUpdate({ 'subscription.stripeSubscriptionId': invoice.subscription }, { 'subscription.status': 'past_due' });
        break;
      }
    }
    res.json({ received: true });
  } catch (err) {
    logger.error('Webhook processing error:', err);
    res.status(500).json({ success: false, message: 'Webhook processing failed' });
  }
};

exports.getSubscription = async (req, res) => {
  try {
    const payments = await Payment.find({ userId: req.user._id }).sort({ createdAt: -1 }).limit(10).lean();
    res.json({ success: true, data: { subscription: req.user.subscription, plan: req.user.plan, payments } });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to fetch subscription' });
  }
};

exports.cancelSubscription = async (req, res) => {
  try {
    const subId = req.user.subscription?.stripeSubscriptionId;
    if (!subId) return res.status(400).json({ success: false, message: 'No active subscription' });
    await stripe.subscriptions.update(subId, { cancel_at_period_end: true });
    await User.findByIdAndUpdate(req.user._id, { 'subscription.status': 'cancelled' });
    res.json({ success: true, message: 'Subscription will be cancelled at end of billing period' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to cancel subscription' });
  }
};
