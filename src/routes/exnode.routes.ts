import { Router, type RequestHandler } from 'express';
import * as exnodeController from '../controllers/exnode.controller.js';
import { authenticate, checkUserBlocked, requireAdmin } from '../middleware/auth.middleware.js';
import { paymentRateLimiter } from '../middleware/rateLimiter.middleware.js';

const router = Router();

// ==============================================
// EXNODE PAYMENT ROUTES
// ==============================================

/**
 * POST /api/v1/payments/exnode
 * Создание платежа через Exnode (криптовалюта USDT TRC-20)
 *
 * @auth Required - JWT token
 * @middleware authenticate - проверка JWT токена
 * @middleware checkUserBlocked - проверка блокировки пользователя
 * @middleware paymentRateLimiter - ограничение частоты запросов
 *
 * @body { amount: number, currency?: 'RUB' }
 * @returns { success, data: { paymentUrl, transactionId, trackerId } }
 */
router.post(
  '/',
  authenticate,
  checkUserBlocked as any,
  paymentRateLimiter,
  exnodeController.createPayment as RequestHandler
);

/**
 * POST /api/v1/payments/exnode/webhook
 * Webhook для получения уведомлений от Exnode об изменении статуса платежа
 *
 * @auth NOT Required - внешний запрос от Exnode
 * @important ВСЕГДА возвращает 200 OK, даже при ошибках
 *
 * @body { tracker_id: string }
 * @returns { success: true, message: string }
 */
router.post(
  '/webhook',
  // ⚠️ БЕЗ authenticate middleware - это внешний запрос от Exnode
  exnodeController.webhook as RequestHandler
);

/**
 * GET /api/v1/payments/exnode/stats
 * Получить статистику по Exnode платежам (только для админов)
 *
 * @auth Required - JWT token + Admin role
 * @middleware authenticate - проверка JWT токена
 * @middleware requireAdmin - проверка прав администратора
 *
 * @returns { success, data: { total, completed } }
 */
router.get(
  '/stats',
  authenticate,
  requireAdmin as any,
  exnodeController.getStats as RequestHandler
);

export default router;
