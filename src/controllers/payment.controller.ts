import { Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';
import { AuthenticatedRequest } from '../middleware/auth.middleware.js';
import * as paymentService from '../services/payment.service.js';
import { successResponse, ValidationError } from '../utils/index.js';
import type { IYooKassaWebhook } from '../types/payment.types.js';
import { config } from '../config/env.config.js';

const prisma = new PrismaClient();

export const createPayment = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = req.user!.userId;
    const { amount } = req.body;

    const result = await paymentService.createPayment({
      userId,
      amount,
      method: 'BANK_CARD',
      returnUrl: `${config.cors.origin}/payment/success`,
    });

    successResponse(res, result, 'Платёж создан');
  } catch (error) {
    next(error);
  }
};

export const webhookHandler = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const webhook: IYooKassaWebhook = req.body;

    await paymentService.processWebhook(webhook);

    res.status(200).send('OK');
  } catch (error) {
    next(error);
  }
};

export const getUserTransactions = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = req.user!.userId;
    const limit = parseInt(req.query.limit as string) || 50;

    const transactions = await prisma.transaction.findMany({
      where: { userId },
      take: limit,
      orderBy: { createdAt: 'desc' },
    });

    successResponse(res, transactions);
  } catch (error) {
    next(error);
  }
};

// Схема валидации для ID транзакции
const GetTransactionSchema = z.object({
  id: z.string().cuid('Неверный формат ID транзакции'),
});

/**
 * Получить транзакцию по ID
 */
export const getTransaction = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = req.user!.userId;
    const { id } = GetTransactionSchema.parse(req.params);

    const transaction = await paymentService.getTransactionById(userId, id);

    successResponse(res, transaction);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return next(new ValidationError(error.errors.map((e) => e.message).join(', ')));
    }
    next(error);
  }
};
