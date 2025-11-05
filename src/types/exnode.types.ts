/**
 * Типы и интерфейсы для интеграции с Exnode Pay API
 * @see https://my.exnode.io/docs/api
 */

// ==============================================
// КОНФИГУРАЦИЯ EXNODE
// ==============================================

/**
 * Конфигурация Exnode из environment variables
 */
export interface IExnodeConfig {
  privateKey: string;
  publicKey: string;
  merchantId?: string;
  apiUrl: string;
}

// ==============================================
// СТАТУСЫ ОРДЕРА
// ==============================================

/**
 * Статусы ордера в Exnode
 */
export enum ExnodeOrderStatus {
  CREATED = 'CREATED',           // Ордер создан
  PAYMENT = 'PAYMENT',           // Ожидает оплаты
  ACCEPTED = 'ACCEPTED',         // Платеж в обработке
  SUCCESS = 'SUCCESS',           // Успешно оплачен (финальный)
  PARTIALLYPAID = 'PARTIALLYPAID', // Частичная оплата
  EXPIRED = 'EXPIRED',           // Истек срок (финальный)
  ERROR = 'ERROR',               // Ошибка/Отменён (финальный)
}

/**
 * Поддерживаемые токены (криптовалюты)
 */
export enum ExnodeToken {
  USDTTRC = 'USDTTRC',  // USDT TRC-20 (Tron)
  USDTERC = 'USDTERC',  // USDT ERC-20 (Ethereum)
  BTC = 'BTC',          // Bitcoin
  ETH = 'ETH',          // Ethereum
  TON = 'TON',          // Toncoin
  TRX = 'TRX',          // Tron
}

/**
 * Поддерживаемые fiat валюты
 */
export enum ExnodeFiatCurrency {
  RUB = 'RUB',
  USD = 'USD',
  EUR = 'EUR',
}

// ==============================================
// СОЗДАНИЕ ОРДЕРА (CREATE ORDER)
// ==============================================

/**
 * Запрос на создание ордера в Exnode
 */
export interface IExnodeCreateOrderRequest {
  token: ExnodeToken;                    // Криптовалюта
  amount: number;                        // Сумма в fiat валюте
  fiat_currency: ExnodeFiatCurrency;     // Фиат валюта
  client_transaction_id: string;         // Уникальный ID транзакции в нашей системе
  payform: boolean;                      // true = форма оплаты, false = прямой адрес
  redirect_url?: string;                 // URL редиректа после оплаты (если payform=true)
  auto_redirect?: boolean;               // Автоматический редирект
  strict_currency?: boolean;             // Строгая валюта (только указанный токен)
  call_back_url: string;                 // Webhook URL
  merchant_uuid?: string;                // ID мерчанта (опционально)
}

/**
 * Ответ при создании ордера с payform=true
 */
export interface IExnodeCreateOrderResponseWithPayform {
  payment_url: string;  // URL формы оплаты
  tracker_id: string;   // Уникальный ID ордера в Exnode
}

/**
 * Ответ при создании ордера с payform=false
 */
export interface IExnodeCreateOrderResponseWithoutPayform {
  tracker_id: string;   // Уникальный ID ордера
  amount: number;       // Сумма в крипте
  dest_tag: string | null; // Тег назначения (для некоторых монет)
  receiver: string;     // Адрес кошелька для отправки
  date_expire: string;  // Дата истечения (ISO 8601)
}

/**
 * Объединенный тип ответа при создании ордера
 */
export type IExnodeCreateOrderResponse =
  | IExnodeCreateOrderResponseWithPayform
  | IExnodeCreateOrderResponseWithoutPayform;

// ==============================================
// ПОЛУЧЕНИЕ ИНФОРМАЦИИ ОБ ОРДЕРЕ (GET ORDER)
// ==============================================

/**
 * Детальная информация об ордере
 */
export interface IExnodeGetOrderResponse {
  tracker_id: string;              // ID ордера
  amount: number;                  // Сумма в крипте
  payed_amount: number;            // Оплаченная сумма в крипте
  token: ExnodeToken;              // Токен (криптовалюта)
  client_transaction_id: string;   // ID транзакции в нашей системе
  date_create: string;             // Дата создания (ISO 8601)
  date_expire: string;             // Дата истечения (ISO 8601)
  status: ExnodeOrderStatus;       // Статус ордера
  receiver: string;                // Адрес кошелька
  hash: string;                    // Хэш транзакции (если оплачено)
  callback_url: string;            // Webhook URL
  fiat_amount: number;             // Сумма в фиат валюте
  fiat_currency: ExnodeFiatCurrency; // Фиат валюта
  fiat_payed_amount: number;       // Оплаченная сумма в фиат валюте
}

// ==============================================
// WEBHOOK (CALLBACK)
// ==============================================

/**
 * Payload webhook от Exnode
 */
export interface IExnodeWebhook {
  tracker_id: string; // ID ордера, по которому изменился статус
}

// ==============================================
// ЗАГОЛОВКИ ДЛЯ API ЗАПРОСОВ
// ==============================================

/**
 * Заголовки для аутентификации запросов к Exnode API
 */
export interface IExnodeApiHeaders {
  ApiPublic: string;   // Публичный ключ
  Timestamp: string;   // Unix timestamp
  Signature: string;   // HMAC-SHA512 подпись
}

// ==============================================
// ВНУТРЕННИЕ ТИПЫ (ДЛЯ НАШЕГО СЕРВИСА)
// ==============================================

/**
 * Запрос на создание платежа от пользователя
 */
export interface ICreateExnodePaymentRequest {
  userId: string;
  amount: number;      // Сумма в копейках (рублях * 100)
  currency: 'RUB';     // Пока только рубли
}

/**
 * Ответ после создания платежа
 */
export interface ICreateExnodePaymentResponse {
  success: boolean;
  paymentUrl: string;    // URL для редиректа пользователя
  transactionId: string; // ID транзакции в нашей БД
  trackerId: string;     // ID ордера в Exnode
  message?: string;
}

/**
 * Результат обработки webhook
 */
export interface IExnodeWebhookProcessResult {
  success: boolean;
  transactionId?: string;
  status: 'COMPLETED' | 'FAILED' | 'PENDING';
  message: string;
}

// ==============================================
// КОНСТАНТЫ
// ==============================================

/**
 * Минимальные суммы для различных токенов (в рублях)
 */
export const EXNODE_MIN_AMOUNTS: Record<ExnodeToken, number> = {
  [ExnodeToken.USDTTRC]: 300,   // 300₽ ≈ 5 USDT
  [ExnodeToken.USDTERC]: 500,   // 500₽ из-за комиссий Ethereum
  [ExnodeToken.BTC]: 1000,      // 1000₽
  [ExnodeToken.ETH]: 1000,      // 1000₽
  [ExnodeToken.TON]: 500,       // 500₽
  [ExnodeToken.TRX]: 300,       // 300₽
};

/**
 * Минимальная сумма пополнения (в копейках)
 * 450 рублей = 45000 копеек
 * Exnode требует минимум ~420₽ для USDT TRC-20
 */
export const EXNODE_MIN_DEPOSIT_AMOUNT = 45000; // копейки

/**
 * Timeout для ордера в минутах
 */
export const EXNODE_ORDER_TIMEOUT_MINUTES = 120; // 2 часа

/**
 * Финальные статусы ордера (не требуют дальнейшей обработки)
 */
export const EXNODE_FINAL_STATUSES: ExnodeOrderStatus[] = [
  ExnodeOrderStatus.SUCCESS,
  ExnodeOrderStatus.EXPIRED,
  ExnodeOrderStatus.ERROR,
];

// ==============================================
// ERROR ТИПЫ
// ==============================================

/**
 * Ошибки Exnode API
 */
export interface IExnodeApiError {
  error: string;
  message: string;
  statusCode?: number;
}

/**
 * Type guard для проверки финального статуса
 */
export function isFinalStatus(status: ExnodeOrderStatus): boolean {
  return EXNODE_FINAL_STATUSES.includes(status);
}

/**
 * Type guard для проверки успешного статуса
 */
export function isSuccessStatus(status: ExnodeOrderStatus): boolean {
  return status === ExnodeOrderStatus.SUCCESS;
}
