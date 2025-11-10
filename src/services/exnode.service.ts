import axios, { AxiosError } from 'axios';
import crypto from 'crypto';
import { v4 as uuidv4 } from 'uuid';
import { Decimal } from '@prisma/client/runtime/library';
import { prisma } from '../config/database.js';
import { config } from '../config/env.config.js';
import { logger } from '../middleware/logger.middleware.js';
import { ValidationError, AppError } from '../utils/errors.util.js';
import type {
  IExnodeCreateOrderRequest,
  IExnodeCreateOrderResponse,
  IExnodeGetOrderResponse,
  IExnodeApiHeaders,
  ICreateExnodePaymentResponse,
  IExnodeWebhookProcessResult,
  ExnodeOrderStatus,
  ExnodeFiatCurrency,
} from '../types/exnode.types.js';
import {
  EXNODE_MIN_DEPOSIT_AMOUNT,
  ExnodeOrderStatus as OrderStatus,
  ExnodeToken,
  isSuccessStatus,
} from '../types/exnode.types.js';

// ==============================================
// КОНСТАНТЫ
// ==============================================

const EXNODE_API_URL = config.exnode.apiUrl;
const EXNODE_PRIVATE_KEY = config.exnode.privateKey;
const EXNODE_PUBLIC_KEY = config.exnode.publicKey;
const EXNODE_MERCHANT_ID = config.exnode.merchantId;

// Используем USDT TRC-20 как основную криптовалюту
const DEFAULT_CRYPTO_TOKEN: ExnodeToken = ExnodeToken.USDTTRC;

// ==============================================
// ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ
// ==============================================

/**
 * Генерация HMAC-SHA512 подписи для запросов к Exnode API
 * @param timestamp - Unix timestamp
 * @param body - Тело запроса (объект или null для GET-запросов)
 * @returns Hex-строка подписи
 */
function generateSignature(timestamp: number, body: Record<string, any> | null): string {
  try {
    // Для GET-запросов используем пустую строку, для POST - JSON
    const bodyString = body === null ? '' : JSON.stringify(body);
    const message = timestamp.toString() + bodyString;
    const signature = crypto.createHmac('sha512', EXNODE_PRIVATE_KEY).update(message).digest('hex');

    logger.debug('Сгенерированная подпись Exnode', {
      timestamp,
      messageLength: message.length,
      isGetRequest: body === null,
    });

    return signature;
  } catch (error) {
    logger.error('Не удалось сгенерировать подпись Exnode', { error });
    throw new AppError('Ошибка генерации подписи', 500);
  }
}

/**
 * Создание заголовков для API запроса к Exnode
 * @param body - Тело запроса (или null для GET-запросов)
 * @returns Заголовки аутентификации
 */
function createApiHeaders(body: Record<string, any> | null): IExnodeApiHeaders {
  const timestamp = Math.floor(Date.now() / 1000);
  const signature = generateSignature(timestamp, body);

  return {
    ApiPublic: EXNODE_PUBLIC_KEY,
    Timestamp: timestamp.toString(),
    Signature: signature,
  };
}

/**
 * Конвертация копеек в рубли
 */
function kopecksToRubles(kopecks: number): number {
  return kopecks / 100;
}

// ==============================================
// ОСНОВНЫЕ ФУНКЦИИ СЕРВИСА
// ==============================================

/**
 * Создание платежа через Exnode
 * @param userId - ID пользователя
 * @param amount - Сумма в копейках
 * @param currency - Валюта (RUB)
 * @returns URL для оплаты и ID транзакции
 */
export async function createPayment(
  userId: string,
  amount: number,
  currency: 'RUB' = 'RUB'
): Promise<ICreateExnodePaymentResponse> {
  try {
    // 1. Валидация суммы
    if (amount < EXNODE_MIN_DEPOSIT_AMOUNT) {
      throw new ValidationError(`Минимальная сумма пополнения ${EXNODE_MIN_DEPOSIT_AMOUNT / 100}₽`);
    }

    // 2. Проверка существования пользователя
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, username: true, isBlocked: true },
    });

    if (!user) {
      throw new ValidationError('Пользователь не найден');
    }

    if (user.isBlocked) {
      throw new ValidationError('Аккаунт заблокирован');
    }

    // 3. Конвертация в рубли для Exnode API
    const amountInRubles = kopecksToRubles(amount);

    // 4. Генерация уникального client_transaction_id
    const clientTransactionId = uuidv4();

    // 5. Создание транзакции в БД (PENDING)
    const transaction = await prisma.transaction.create({
      data: {
        userId,
        amount,
        type: 'DEPOSIT',
        status: 'PENDING',
        provider: 'EXNODE',
        fiatCurrency: currency,
        paymentId: clientTransactionId, // используем как client_transaction_id
      },
    });

    logger.info('Транзакция создана', {
      transactionId: transaction.id,
      userId,
      amount,
      clientTransactionId,
    });

    // 6. Формирование callback URL
    const callbackUrl = `${config.server.url}/api/v1/payments/exnode/webhook`;

    // 7. Подготовка запроса к Exnode API
    const requestBody: IExnodeCreateOrderRequest = {
      token: DEFAULT_CRYPTO_TOKEN,
      amount: amountInRubles,
      fiat_currency: currency as ExnodeFiatCurrency,
      client_transaction_id: clientTransactionId,
      payform: true, // Используем готовую форму оплаты Exnode
      redirect_url: `${config.frontend.url}/payment/success?transactionId=${transaction.id}`,
      auto_redirect: true,
      strict_currency: true,
      call_back_url: callbackUrl,
      ...(EXNODE_MERCHANT_ID && { merchant_uuid: EXNODE_MERCHANT_ID }),
    };

    // 8. Создание заголовков с подписью
    const headers = createApiHeaders(requestBody);

    // 9. Запрос к Exnode API
    logger.info('Создание Exnode заказа', {
      transactionId: transaction.id,
      amount: amountInRubles,
      token: DEFAULT_CRYPTO_TOKEN,
    });

    const response = await axios.post<IExnodeCreateOrderResponse>(
      `${EXNODE_API_URL}/api/crypto/invoice/create`,
      requestBody,
      {
        headers: {
          ...headers,
          'Content-Type': 'application/json',
        },
      }
    );

    const orderData = response.data;

    // 10. Проверка наличия payment_url (payform=true)
    if (!('payment_url' in orderData)) {
      throw new AppError('Exnode API не вернул payment_url', 500);
    }

    const { payment_url, tracker_id } = orderData;

    // 11. Рассчитываем время истечения (12 часов с момента создания)
    const EXNODE_ORDER_TIMEOUT_HOURS = 12;
    const expiresAt = new Date(Date.now() + EXNODE_ORDER_TIMEOUT_HOURS * 60 * 60 * 1000);

    // 12. Обновление транзакции с tracker_id и expiresAt
    await prisma.transaction.update({
      where: { id: transaction.id },
      data: {
        trackerId: tracker_id,
        expiresAt: expiresAt,
      },
    });

    logger.info('Exnode заказ успешно создан', {
      transactionId: transaction.id,
      trackerId: tracker_id,
      expiresAt: expiresAt.toISOString(),
    });

    // 13. Возврат результата
    return {
      success: true,
      paymentUrl: payment_url,
      transactionId: transaction.id,
      trackerId: tracker_id,
      message: 'Платёж создан успешно',
    };
  } catch (error) {
    logger.error('Не удалось создать платеж Exnode', { error, userId, amount });

    // Обработка ошибок Axios
    if (axios.isAxiosError(error)) {
      const axiosError = error as AxiosError;
      const errorData = axiosError.response?.data as any;
      const status = axiosError.response?.status;

      // Детальное логирование ответа от Exnode
      logger.error('Exnode API response details', {
        status,
        statusText: axiosError.response?.statusText,
        data: errorData,
        headers: axiosError.response?.headers,
      });

      // Специфичные ошибки
      if (status === 402) {
        throw new AppError(
          'Ошибка Exnode: Недостаточно средств на балансе или аккаунт не активирован. Проверьте баланс на my.exnode.io',
          402
        );
      }

      throw new AppError(
        errorData?.message || errorData?.error || 'Ошибка при создании платежа в Exnode',
        status || 500
      );
    }

    throw error;
  }
}

/**
 * Получение информации об ордере из Exnode
 * @param trackerId - ID ордера в Exnode
 * @returns Информация об ордере
 */
export async function getOrderInfo(trackerId: string): Promise<IExnodeGetOrderResponse> {
  try {
    // Для GET запроса используем null (пустая строка в подписи)
    const headers = createApiHeaders(null);

    logger.info('Fetching Exnode order info', { trackerId });

    const response = await axios.get<IExnodeGetOrderResponse>(
      `${EXNODE_API_URL}/api/crypto/invoice/get`,
      {
        params: { tracker_id: trackerId },
        headers: {
          ...headers,
          'Content-Type': 'application/json',
        },
      }
    );

    logger.debug('Exnode полученная информация заказа', {
      trackerId,
      status: response.data.status,
    });

    return response.data;
  } catch (error) {
    logger.error('Не удалось получить информацию о заказе Exnode', { error, trackerId });

    if (axios.isAxiosError(error)) {
      const axiosError = error as AxiosError;
      const errorData = axiosError.response?.data as any;

      throw new AppError(
        errorData?.message || 'Ошибка при получении информации об ордере',
        axiosError.response?.status || 500
      );
    }

    throw error;
  }
}

/**
 * Обработка webhook от Exnode
 * @param trackerId - ID ордера из webhook
 * @returns Результат обработки
 */
export async function processWebhook(trackerId: string): Promise<IExnodeWebhookProcessResult> {
  try {
    logger.info('Обработка Exnode webhook', { trackerId });

    // 1. Получить актуальную информацию об ордере из API
    const orderInfo = await getOrderInfo(trackerId);

    logger.info('Exnode статус заказа', {
      trackerId,
      status: orderInfo.status,
      clientTransactionId: orderInfo.client_transaction_id,
    });

    // 2. Найти транзакцию в БД
    const transaction = await prisma.transaction.findUnique({
      where: { trackerId },
      include: { user: true },
    });

    if (!transaction) {
      logger.warn('Транзакция не найдена для tracker_id', { trackerId });
      return {
        success: false,
        status: 'FAILED',
        message: 'Транзакция не найдена',
      };
    }

    // 3. Проверка idempotency - уже обработана?
    if (transaction.status !== 'PENDING') {
      logger.info('Транзакция уже обработана', {
        transactionId: transaction.id,
        status: transaction.status,
      });
      return {
        success: true,
        transactionId: transaction.id,
        status: transaction.status as 'COMPLETED' | 'FAILED',
        message: 'Транзакция уже обработана',
      };
    }

    // 4. Обработка в зависимости от статуса
    const orderStatus = orderInfo.status as ExnodeOrderStatus;

    if (isSuccessStatus(orderStatus)) {
      // === УСПЕШНАЯ ОПЛАТА ===
      logger.info('Обработка успешного платежа', {
        transactionId: transaction.id,
        userId: transaction.userId,
        amount: transaction.amount,
        cryptoAmount: orderInfo.payed_amount,
      });

      // Атомарная транзакция БД: зачисление баланса + обновление статуса
      await prisma.$transaction(async (tx) => {
        // Получить текущий баланс пользователя
        const user = await tx.user.findUnique({
          where: { id: transaction.userId },
          select: { balance: true },
        });

        if (!user) {
          throw new AppError('Пользователь не найден', 404);
        }

        // Обновить баланс пользователя
        await tx.user.update({
          where: { id: transaction.userId },
          data: {
            balance: user.balance + transaction.amount,
          },
        });

        // Обновить транзакцию
        await tx.transaction.update({
          where: { id: transaction.id },
          data: {
            status: 'COMPLETED',
            cryptoAmount: new Decimal(orderInfo.payed_amount.toString()),
          },
        });

        logger.info('Баланс успешно обновлен', {
          userId: transaction.userId,
          oldBalance: user.balance,
          newBalance: user.balance + transaction.amount,
          amountAdded: transaction.amount,
        });
      });

      return {
        success: true,
        transactionId: transaction.id,
        status: 'COMPLETED',
        message: 'Баланс успешно пополнен',
      };
    } else if (orderStatus === OrderStatus.EXPIRED || orderStatus === OrderStatus.ERROR) {
      // === НЕУСПЕШНАЯ ОПЛАТА ===
      logger.info('Платеж не был произведен или истек срок его действия', {
        transactionId: transaction.id,
        status: orderStatus,
      });

      await prisma.transaction.update({
        where: { id: transaction.id },
        data: { status: 'FAILED' },
      });

      return {
        success: true,
        transactionId: transaction.id,
        status: 'FAILED',
        message: `Платёж ${orderStatus === OrderStatus.EXPIRED ? 'истёк' : 'отменён'}`,
      };
    } else {
      // === ПРОМЕЖУТОЧНЫЙ СТАТУС ===
      logger.info('Оплата в промежуточном состоянии', {
        transactionId: transaction.id,
        status: orderStatus,
      });

      return {
        success: true,
        transactionId: transaction.id,
        status: 'PENDING',
        message: 'Платёж в обработке',
      };
    }
  } catch (error) {
    logger.error('Не удалось обработать webhook Exnode', { error, trackerId });

    // Возвращаем успешный результат, чтобы Exnode не повторял webhook
    // Ошибка уже залогирована
    return {
      success: false,
      status: 'FAILED',
      message: error instanceof Error ? error.message : 'Ошибка обработки webhook',
    };
  }
}

/**
 * Получить статистику по Exnode платежам
 * @returns Статистика
 */
export async function getExnodeStats() {
  try {
    const stats = await prisma.transaction.aggregate({
      where: {
        provider: 'EXNODE',
        type: 'DEPOSIT',
      },
      _count: {
        id: true,
      },
      _sum: {
        amount: true,
      },
    });

    const completedStats = await prisma.transaction.aggregate({
      where: {
        provider: 'EXNODE',
        type: 'DEPOSIT',
        status: 'COMPLETED',
      },
      _count: {
        id: true,
      },
      _sum: {
        amount: true,
      },
    });

    return {
      total: {
        count: stats._count.id,
        amount: stats._sum.amount || 0,
      },
      completed: {
        count: completedStats._count.id,
        amount: completedStats._sum.amount || 0,
      },
    };
  } catch (error) {
    logger.error('Failed to get Exnode stats', { error });
    throw error;
  }
}
