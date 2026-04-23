import express from 'express';
import { authenticateToken } from '../middleware/auth.js';
import { paymentRateLimit } from '../middleware/rateLimit.js';
import {
	createCartCheckout,
	createPayment,
	createRefundRequest,
	createSimpleCheckout,
	getPaymentStatus,
} from '../controllers/paymentsController.js';
const router = express.Router();

router.post('/cart-checkout', paymentRateLimit, authenticateToken, createCartCheckout);
router.post('/checkout', paymentRateLimit, authenticateToken, createSimpleCheckout);
router.post('/refund', paymentRateLimit, authenticateToken, createRefundRequest);
router.get('/status/:eventId', authenticateToken, getPaymentStatus);
router.post('/', paymentRateLimit, authenticateToken, createPayment);
export default router;
