/**
 * Платежные типы и константы для CS:GO Case Opening Platform
 */

// ==============================================
// ПЛАТЕЖНЫЕ КОНСТАНТЫ
// ==============================================

export const PaymentProviders = {
  YOOKASSA: 'YOOKASSA',
  // Placeholder для будущих платежных систем
  // STRIPE: 'STRIPE',
  // PAYPAL: 'PAYPAL',
} as const;

export type PaymentProvider = typeof PaymentProviders[keyof typeof PaymentProviders];

export const PaymentMethods = {
  BANK_CARD: 'BANK_CARD',
  YOO_MONEY: 'YOO_MONEY', // Яндекс.Деньги
  SBERBANK: 'SBERBANK',
  QIWI: 'QIWI',
  WEBMONEY: 'WEBMONEY',
  SBP: 'SBP', // Система быстрых платежей
} as const;

export type PaymentMethod = typeof PaymentMethods[keyof typeof PaymentMethods];

export const PaymentStatuses = {
  PENDING: 'PENDING',     // Ожидает оплаты
  PROCESSING: 'PROCESSING', // В обработке
  SUCCEEDED: 'SUCCEEDED',   // Успешно завершен
  CANCELED: 'CANCELED',     // Отменен
  REFUNDED: 'REFUNDED',     // Возвращен
  EXPIRED: 'EXPIRED',       // Просрочен
} as const;

export type PaymentStatus = typeof PaymentStatuses[keyof typeof PaymentStatuses];

export const Currencies = {
  RUB: 'RUB',
  USD: 'USD', // Для будущей поддержки
  EUR: 'EUR', // Для будущей поддержки
} as const;

export type Currency = typeof Currencies[keyof typeof Currencies];

// ==============================================
// ОСНОВНЫЕ ИНТЕРФЕЙСЫ ПЛАТЕЖЕЙ
// ==============================================

/**
 * Базовый интерфейс платежа
 */
export interface IPayment {
  id: string;
  userId: string;
  provider: PaymentProvider;
  method: PaymentMethod;
  amount: number; // в копейках/центах
  status: PaymentStatus;
  currency: Currency;
  providerPaymentId?: string; // ID платежа в системе провайдера
  description?: string;
  metadata?: Record<string, any>; // Дополнительные данные
  createdAt: Date;
  updatedAt: Date;
  completedAt?: Date; // Дата завершения платежа
}

/**
 * Расширенный интерфейс платежа с деталями пользователя
 */
export interface IPaymentWithDetails extends IPayment {
  user: {
    id: string;
    username: string;
    email?: string;
  };
}

/**
 * Запрос на создание платежа
 */
export interface ICreatePaymentRequest {
  userId: string;
  amount: number; // в копейках
  method: PaymentMethod;
  description?: string;
  returnUrl?: string; // URL для возврата после оплаты
  metadata?: Record<string, any>;
}

/**
 * Ответ при создании платежа (редирект на провайдер)
 */
export interface ICreatePaymentResponse {
  success: boolean;
  paymentId: string;
  confirmationUrl?: string; // URL для подтверждения оплаты
  message?: string;
}

/**
 * Webhook уведомление от платежной системы
 */
export interface IPaymentWebhook {
  id: string;
  event: string;
  payment: {
    id: string;
    status: PaymentStatus;
    amount: number;
    currency: string;
    metadata?: Record<string, any>;
  };
  processedAt: Date;
}

// ==============================================
// YOOKASSA СПЕЦИФИЧЕСКИЕ ТИПЫ
// ==============================================

/**
 * YooKassa запрос на создание платежа
 */
export interface IYooKassaCreatePaymentRequest {
  amount: {
    value: string; // "10.00"
    currency: string; // "RUB"
  };
  capture: boolean; // Автоматическое подтверждение
  confirmation: {
    type: 'redirect';
    return_url: string;
  };
  description?: string;
  metadata?: Record<string, any>;
  receipt?: {
    customer: {
      email?: string;
      phone?: string;
    };
    items: Array<{
      description: string;
      quantity: string;
      amount: {
        value: string;
        currency: string;
      };
      vat_code: string;
    }>;
  };
}

/**
 * YooKassa ответ при создании платежа
 */
export interface IYooKassaCreatePaymentResponse {
  id: string;
  status: PaymentStatus;
  amount: {
    value: string;
    currency: string;
  };
  confirmation?: {
    type: 'redirect';
    confirmation_url: string;
  };
  created_at: string;
  description?: string;
  metadata?: Record<string, any>;
  paid: boolean;
  refundable: boolean;
}

/**
 * YooKassa webhook payload
 */
export interface IYooKassaWebhook {
  type: string; // 'notification'
  event: string; // 'payment.succeeded', 'payment.canceled', etc.
  object: IYooKassaWebhookObject;
}

export interface IYooKassaWebhookObject {
  id: string;
  status: PaymentStatus;
  amount: {
    value: string;
    currency: string;
  };
  income_amount?: {
    value: string;
    currency: string;
  };
  description?: string;
  created_at: string;
  captured_at?: string;
  metadata?: Record<string, any>;
  payment_method: {
    type: string;
    id: string;
    saved: boolean;
    title?: string;
    card?: {
      last4: string;
      expiry_year: string;
      expiry_month: string;
      card_type: string;
    };
  };
  refundable: boolean;
}

// ==============================================
// ОПЕРАЦИИ С БАЛАНСОМ
// ==============================================

/**
 * Запрос на пополнение баланса
 */
export interface ITopupRequest {
  amount: number; // в копейках
  method: PaymentMethod;
  description?: string;
}

/**
 * Ответ после создания запроса на пополнение
 */
export interface ITopupResponse {
  success: boolean;
  payment: IPayment;
  redirectUrl?: string; // URL для оплаты
  message?: string;
}

/**
 * Транзакция баланса пользователя
 */
export interface IBalanceTransaction {
  id: string;
  userId: string;
  paymentId?: string;
  type: 'TOPUP' | 'WITHDRAWAL' | 'CASE_OPEN' | 'ADMIN_ADJUSTMENT';
  amount: number; // в копейках (положительное - пополнение, отрицательное - списание)
  balanceBefore: number;
  balanceAfter: number;
  description?: string;
  metadata?: Record<string, any>;
  createdAt: Date;
}

/**
 * История баланса пользователя
 */
export interface IBalanceTransactionWithDetails extends IBalanceTransaction {
  payment?: IPayment;
}

// ==============================================
// АДМИНСКАЯ СТАТИСТИКА
// ==============================================

/**
 * Статистика платежей
 */
export interface IPaymentStats {
  totalAmount: number; // Общая сумма
  totalPayments: number; // Количество платежей
  successCount: number; // Успешные платежи
  pendingCount: number; // В обработке
  failedCount: number; // Неуспешные
  averageAmount: number; // Средняя сумма
  currency: Currency;
  period: 'DAY' | 'WEEK' | 'MONTH' | 'YEAR';
}

/**
 * Детальная статистика по методам оплаты
 */
export interface IPaymentMethodStats {
  method: PaymentMethod;
  count: number;
  amount: number;
  percentage: number; // Доля от общей суммы
}

// ==============================================
// МЕТАДАННЫЕ И НАСТРОЙКИ
// ==============================================

/**
 * Настройки платежной системы
 */
export interface IPaymentConfig {
  provider: PaymentProvider;
  enabled: boolean;
  methods: PaymentMethod[];
  minAmount: number; // Минимальная сумма в копейках
  maxAmount: number; // Максимальная сумма в копейках
  commission: number; // Комиссия в процентах
}

/**
 * Лимиты платежей
 */
export interface IPaymentLimits {
  dailyLimit: number; // Дневной лимит в копейках
  monthlyLimit: number; // Месячный лимит в копейках
  maxSinglePayment: number; // Максимальный платеж
  minPayment: number; // Минимальный платеж
}

// ==============================================
// ВСПОМОГАТЕЛЬНЫЕ ТИПЫ
// ==============================================

/**
 * Опции создания платежа
 */
export interface IPaymentOptions {
  autoCapture?: boolean; // Автоматическое подтверждение
  returnUrl?: string; // URL возврата
  cancelUrl?: string; // URL отмены
  description?: string; // Описание
  metadata?: Record<string, any>; // Метаданные
}

/**
 * Фильтры для поиска платежей
 */
export interface IPaymentFilters {
  userId?: string;
  status?: PaymentStatus;
  provider?: PaymentProvider;
  method?: PaymentMethod;
  dateFrom?: Date;
  dateTo?: Date;
  minAmount?: number;
  maxAmount?: number;
}

/**
 * Пагинация платежей
 */
export interface IPaymentPagination {
  page: number;
  limit: number;
  total: number;
  hasMore: boolean;
}

/**
 * Результат запроса списка платежей
 */
export interface IPaymentListResult {
  payments: IPaymentWithDetails[];
  pagination: IPaymentPagination;
}
