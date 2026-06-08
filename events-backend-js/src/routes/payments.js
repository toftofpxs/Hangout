import express from 'express';
import { authenticateToken } from '../middleware/auth.js';
import { paymentRateLimit } from '../middleware/rateLimit.js';
import {
	createCartCheckout,
	createCartStripeCheckoutSession,
	confirmCartStripeCheckoutSession,
	confirmStripeCheckoutSession,
	createPayment,
	createRefundRequest,
	createSimpleCheckout,
	getPaymentStatus,
	handleStripeWebhook,
} from '../controllers/paymentsController.js';
const router = express.Router();

router.post('/webhook', express.raw({ type: 'application/json' }), handleStripeWebhook);
router.post('/cart-checkout', paymentRateLimit, authenticateToken, createCartCheckout);
router.post('/cart-checkout/session', paymentRateLimit, authenticateToken, createCartStripeCheckoutSession);
router.post('/cart-checkout/confirm', paymentRateLimit, authenticateToken, confirmCartStripeCheckoutSession);
router.post('/checkout', paymentRateLimit, authenticateToken, createSimpleCheckout);
router.post('/confirm-checkout', paymentRateLimit, authenticateToken, confirmStripeCheckoutSession);
router.post('/refund', paymentRateLimit, authenticateToken, createRefundRequest);
router.get('/status/:eventId', authenticateToken, getPaymentStatus);
router.post('/', paymentRateLimit, authenticateToken, createPayment);
export default router;
