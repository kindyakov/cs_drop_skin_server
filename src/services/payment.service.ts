import axios from 'axios';
import { v4 as uuidv4 } from 'uuid';
import { PrismaClient } from '@prisma/client';
import type {
  ICreatePaymentRequest,
  IYooKassaCreatePaymentRequest,
  IYooKassaCreatePaymentResponse,
  IYooKassaWebhook,
} from '../types/payment.types.js';
import { config } from '../config/env.config.js';
import { logger } from '../middleware/logger.middleware.js';
import { ValidationError } from '../utils/index.js';

const prisma = new PrismaClient();

export const createPayment = async (
  input: ICreatePaymentRequest
): Promise<{ confirmationUrl: string; transactionId: string }> => {
  try {
    // Валидация суммы
    if (input.amount < 1000) {
      // 10 рублей в копейках
      throw new ValidationError('Минимальная сумма пополнения 10 рублей');
    }

    // Создать транзакцию в БД
    const transaction = await prisma.transaction.create({
      data: {
        userId: input.userId,
        amount: input.amount, // уже в копейках
        type: 'DEPOSIT',
        status: 'PENDING',
      },
    });

    // Создать платеж в YooKassa
    const idempotenceKey = uuidv4();
    const response = await axios.post<IYooKassaCreatePaymentResponse>(
      'https://api.yookassa.ru/v3/payments',
      {
        amount: {
          value: (input.amount / 100).toFixed(2), // конвертируем в рубли
          currency: 'RUB',
        },
        confirmation: {
          type: 'redirect',
          return_url: input.returnUrl || `${config.cors.origin}/payment/success`,
        },
        capture: true,
        metadata: {
          userId: input.userId,
          transactionId: transaction.id,
        },
        description:
          input.description || `Пополнение баланса на ${(input.amount / 100).toFixed(2)} руб.`,
      } as IYooKassaCreatePaymentRequest,
      {
        auth: {
          username: config.yookassa.shopId,
          password: config.yookassa.secretKey,
        },
        headers: {
          'Idempotence-Key': idempotenceKey,
          'Content-Type': 'application/json',
        },
      }
    );

    // Обновить transaction с paymentId
    await prisma.transaction.update({
      where: { id: transaction.id },
      data: { paymentId: response.data.id },
    });

    logger.info('Платеж создан', { transactionId: transaction.id, paymentId: response.data.id });

    return {
      confirmationUrl: response.data.confirmation?.confirmation_url || '',
      transactionId: transaction.id,
    };
  } catch (error) {
    logger.error('Ошибка создания платежа', { error });
    throw error;
  }
};

export const processWebhook = async (webhook: IYooKassaWebhook): Promise<void> => {
  try {
    const paymentObject = webhook.object;
    const { id: paymentId, status, metadata } = paymentObject;
    const { userId, transactionId } = metadata || {};

    // Найти транзакцию
    if (!transactionId) {
      logger.warn('Отсутствует transactionId в webhook', { paymentId });
      return;
    }

    const transaction = await prisma.transaction.findFirst({
      where: { id: transactionId, paymentId },
    });

    if (!transaction) {
      logger.warn('Транзакция не найдена для webhook', { paymentId, transactionId });
      return;
    }

    // Уже обработан
    if (transaction.status !== 'PENDING') {
      logger.info('Транзакция уже обработана', { transactionId });
      return;
    }

    if (status === 'SUCCEEDED') {
      // Зачислить средства
      const user = await prisma.user.findUnique({
        where: { id: userId },
      });

      if (!user) {
        throw new Error('User not found');
      }

      await prisma.$transaction([
        prisma.user.update({
          where: { id: userId },
          data: { balance: user.balance + transaction.amount },
        }),
        prisma.transaction.update({
          where: { id: transactionId },
          data: { status: 'COMPLETED' },
        }),
      ]);

      logger.info('Платеж успешно обработан', {
        transactionId,
        amount: transaction.amount,
        userId,
      });
    } else if (status === 'CANCELED') {
      await prisma.transaction.update({
        where: { id: transactionId },
        data: { status: 'FAILED' },
      });

      logger.info('Платеж отменен', { transactionId });
    }
  } catch (error) {
    logger.error('Ошибка обработки webhook', { error });
    throw error;
  }
};
