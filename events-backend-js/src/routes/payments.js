import express from 'express';
import { authenticateToken } from '../middleware/auth.js';
import {
	createCartCheckout,
	createPayment,
	createRefundRequest,
	createSimpleCheckout,
	getPaymentStatus,
} from '../controllers/paymentsController.js';
const router = express.Router();

router.post('/cart-checkout', authenticateToken, createCartCheckout);
router.post('/checkout', authenticateToken, createSimpleCheckout);
router.post('/refund', authenticateToken, createRefundRequest);
router.get('/status/:eventId', authenticateToken, getPaymentStatus);
router.post('/', authenticateToken, createPayment);
export default router;
