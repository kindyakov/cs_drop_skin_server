import { Router, type RequestHandler } from 'express';
import * as paymentController from '../controllers/payment.controller.js';
import { authenticate, paymentRateLimiter, validatePayment, checkUserBlocked } from '../middleware/index.js';

const router = Router();

// Создание платежа (защищено + валидация + rate limit)
router.post(
  '/create',
  authenticate,
  checkUserBlocked as any,
  validatePayment,
  paymentRateLimiter,
  paymentController.createPayment as RequestHandler
);

// Webhook от YooKassa (публичный endpoint)
router.post(
  '/webhook',
  paymentController.webhookHandler as RequestHandler
);

// История транзакций (защищено)
router.get(
  '/transactions',
  authenticate,
  paymentController.getUserTransactions as RequestHandler
);

export default router;
