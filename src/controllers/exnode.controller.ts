import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import type { AuthenticatedRequest } from '../middleware/auth.middleware.js';
import * as exnodeService from '../services/exnode.service.js';
import { logger } from '../middleware/logger.middleware.js';
import { ValidationError } from '../utils/errors.util.js';
import { EXNODE_MIN_DEPOSIT_AMOUNT } from '../types/exnode.types.js';

// ==============================================
// ZOD ВАЛИДАЦИОННЫЕ СХЕМЫ
// ==============================================

/**
 * Схема валидации для создания платежа
 */
const CreatePaymentSchema = z.object({
  amount: z
    .number({
      required_error: 'Сумма обязательна',
      invalid_type_error: 'Сумма должна быть числом',
    })
    .int('Сумма должна быть целым числом')
    .min(EXNODE_MIN_DEPOSIT_AMOUNT, `Минимальная сумма пополнения ${EXNODE_MIN_DEPOSIT_AMOUNT / 100}₽`)
    .max(100000000, 'Максимальная сумма пополнения 1,000,000₽'), // 1 млн рублей
  currency: z.enum(['RUB']).default('RUB'),
});

/**
 * Схема валидации для webhook
 */
const WebhookSchema = z.object({
  tracker_id: z.string({
    required_error: 'tracker_id обязателен',
  }).min(1, 'tracker_id не может быть пустым'),
});

// ==============================================
// КОНТРОЛЛЕРЫ
// ==============================================

/**
 * Создание платежа через Exnode
 * POST /api/v1/payments/exnode
 *
 * @requires Authentication
 * @body { amount: number, currency?: 'RUB' }
 * @returns { success, paymentUrl, transactionId, trackerId }
 */
export const createPayment = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    // 1. Проверка аутентификации
    if (!req.user) {
      throw new ValidationError('Требуется авторизация');
    }

    const userId = req.user.userId;

    // 2. Валидация body
    const validatedData = CreatePaymentSchema.parse(req.body);
    const { amount, currency } = validatedData;

    logger.info('Creating Exnode payment', {
      userId,
      amount,
      currency,
      ip: req.ip,
    });

    // 3. Вызов сервиса
    const result = await exnodeService.createPayment(userId, amount, currency);

    // 4. Успешный ответ
    res.status(200).json({
      success: true,
      data: {
        paymentUrl: result.paymentUrl,
        transactionId: result.transactionId,
        trackerId: result.trackerId,
      },
      message: result.message,
    });
  } catch (error) {
    // Zod validation errors
    if (error instanceof z.ZodError) {
      const errorMessages = error.errors.map((err) => err.message).join(', ');
      return next(new ValidationError(errorMessages));
    }

    next(error);
  }
};

/**
 * Обработка webhook от Exnode
 * POST /api/v1/payments/exnode/webhook
 *
 * @public Без аутентификации (внешний запрос от Exnode)
 * @body { tracker_id: string }
 * @returns 200 OK (всегда, даже при ошибках)
 */
export const webhook = async (req: Request, res: Response, _next: NextFunction) => {
  try {
    logger.info('Received Exnode webhook', {
      body: req.body,
      ip: req.ip,
      headers: {
        'user-agent': req.headers['user-agent'],
        'content-type': req.headers['content-type'],
      },
    });

    // 1. Валидация body
    const validatedData = WebhookSchema.parse(req.body);
    const { tracker_id } = validatedData;

    // 2. Обработка webhook
    const result = await exnodeService.processWebhook(tracker_id);

    logger.info('Exnode webhook processed', {
      trackerId: tracker_id,
      result: result.status,
      transactionId: result.transactionId,
    });

    // 3. ВАЖНО: ВСЕГДА возвращаем 200 OK
    // Даже если обработка не удалась, чтобы Exnode не повторял webhook
    res.status(200).json({
      success: true,
      message: 'Webhook processed',
    });
  } catch (error) {
    // Логируем ошибку, но возвращаем 200 OK
    logger.error('Error processing Exnode webhook', {
      error,
      body: req.body,
    });

    // ВАЖНО: возвращаем 200, чтобы Exnode не повторял webhook
    res.status(200).json({
      success: true,
      message: 'Webhook received',
    });
  }
};

/**
 * Получить статистику по Exnode платежам (admin only)
 * GET /api/v1/payments/exnode/stats
 *
 * @requires Authentication & Admin role
 * @returns Статистика платежей
 */
export const getStats = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    if (!req.user) {
      throw new ValidationError('Требуется авторизация');
    }

    logger.info('Fetching Exnode stats', { userId: req.user.userId });

    const stats = await exnodeService.getExnodeStats();

    res.status(200).json({
      success: true,
      data: stats,
    });
  } catch (error) {
    next(error);
  }
};
