# Exnode Pay Integration Guide - Краткая документация

## 🔑 Аутентификация

### Headers (для всех запросов):

```
ApiPublic: <ваш публичный ключ>
Timestamp: <текущий Unix timestamp>
Signature: <HMAC-SHA512 подпись>
```

### Генерация Signature:

```javascript
// Signature = HMAC_SHA512(timestamp + requestBody, privateKey)
const crypto = require('crypto');

function generateSignature(timestamp, body, privateKey) {
  const message = timestamp.toString() + JSON.stringify(body);
  return crypto.createHmac('sha512', privateKey).update(message).digest('hex');
}
```

---

## 📋 Основные эндпоинты

### 1. **Создание Order (платежа)**

**POST** `https://my.exnode.io/api/crypto/invoice/create`

#### Request Body (с payform - форма оплаты):

```json
{
  "token": "USDTTRC",
  "amount": 50,
  "fiat_currency": "RUB",
  "client_transaction_id": "unique-id-in-your-system",
  "payform": true,
  "redirect_url": "https://yoursite.com/payment/success",
  "auto_redirect": true,
  "strict_currency": true,
  "call_back_url": "https://yoursite.com/api/v1/payments/exnode/webhook",
  "merchant_uuid": "your-merchant-uuid" // опционально
}
```

#### Request Body (без payform - прямой адрес):

```json
{
  "token": "USDTTRC",
  "amount": 50,
  "fiat_currency": "RUB",
  "client_transaction_id": "unique-id-in-your-system",
  "payform": false,
  "call_back_url": "https://yoursite.com/api/v1/payments/exnode/webhook"
}
```

#### Response (с payform):

```json
{
  "payment_url": "https://pay.exnode.io/sfdweqwe...",
  "tracker_id": "0190252e-d6bc-7c63-93c7-22..."
}
```

#### Response (без payform):

```json
{
  "tracker_id": "0190252e-d6bc-7c63-93c7-22...",
  "amount": 50,
  "dest_tag": null,
  "receiver": "TPnRrhtYFosKn...",
  "date_expire": "2022-05-12T16:59:37Z"
}
```

---

### 2. **Получение информации об Order**

**GET** `https://my.exnode.io/api/crypto/invoice/get?tracker_id={tracker_id}`

#### Response:

```json
{
  "tracker_id": "155091d9148259b1bb3971b...",
  "amount": 50,
  "payed_amount": 50,
  "token": "USDTTRC",
  "client_transaction_id": "your-unique-id",
  "date_create": "2022-05-12T14:59:37Z",
  "date_expire": "2022-05-12T16:59:37Z",
  "status": "SUCCESS",
  "receiver": "TPnRrhtYFosKn...",
  "hash": "155091d9148259b1bb3971b...",
  "callback_url": "https://yoursite.com/webhook",
  "fiat_amount": 3000,
  "fiat_currency": "RUB",
  "fiat_payed_amount": 3000
}
```

---

## 📊 Статусы Order

| Статус          | Описание           | Final Status |
| --------------- | ------------------ | ------------ |
| `CREATED`       | Ордер создан       | ❌           |
| `PAYMENT`       | Ожидает оплаты     | ❌           |
| `ACCEPTED`      | Платеж в обработке | ❌           |
| `SUCCESS`       | Успешно оплачен    | ✅           |
| `PARTIALLYPAID` | Частичная оплата   | ❌           |
| `EXPIRED`       | Истек срок         | ✅           |
| `ERROR`         | Ошибка/Отменён     | ✅           |

---

## 🔔 Webhook (Callback)

### Что приходит:

Когда статус ордера меняется, Exnode отправляет **POST** запрос на ваш `call_back_url`:

```json
{
  "tracker_id": "0190252e-d6bc-7c63-93c7-22..."
}
```

### Что делать:

1. Получить `tracker_id` из webhook
2. Сделать запрос к `/api/crypto/invoice/get?tracker_id={tracker_id}`
3. Проверить статус ордера
4. Если `status === "SUCCESS"` → зачислить баланс по `client_transaction_id`

⚠️ **ВАЖНО**: Callback ≠ успешная оплата! Всегда проверяйте статус через API.

---

## 💰 Поддерживаемые криптовалюты (примеры)

- `USDTTRC` - USDT (TRC-20, Tron)
- `USDTERC` - USDT (ERC-20, Ethereum)
- `BTC` - Bitcoin
- `ETH` - Ethereum
- `TON` - Toncoin
- `TRX` - Tron

---

## 💵 Минимальные суммы (примерные)

| Криптовалюта | Минимум пополнения |
| ------------ | ------------------ |
| USDTTRC      | 10 USDT            |
| BTC          | 0.0001 BTC         |
| ETH          | 0.01 ETH           |

---

## 🔥 Flow для нашего проекта (пополнение USDT)

### Вариант 1: С payment form (рекомендуется)

1. User → нажимает "Пополнить" на фронте
2. Backend → создает Order через `/api/crypto/invoice/create` с `payform: true`
3. Backend → получает `payment_url` и сохраняет Transaction (PENDING)
4. Backend → возвращает `payment_url` на фронт
5. User → переходит на `payment_url` → оплачивает
6. Exnode → отправляет webhook на наш сервер
7. Backend → получает webhook → запрашивает статус ордера
8. Backend → если SUCCESS → зачисляет баланс → меняет Transaction на COMPLETED

### Вариант 2: Прямой адрес (без формы)

1-3. То же самое, но `payform: false` 4. Backend → возвращает `receiver` (адрес кошелька) на фронт 5. User → вручную переводит USDT на адрес
6-8. То же самое

**Рекомендую Вариант 1** - проще для пользователя.

---

## 🛡️ Что нужно для работы

### Environment Variables:

```env
EXNODE_PRIVATE_KEY=x7v3ijkwerjt9npxq3d...
EXNODE_PUBLIC_KEY=hnen35o7vfd568ojxdmttu7v2lt5e8cg...
EXNODE_MERCHANT_ID=c4ae1389-678a-4602-aecb-f23a645acb0b # опционально
EXNODE_API_URL=https://my.exnode.io
```

### Примечания:

- `MERCHANT_ID` нужен если у вас несколько merchant аккаунтов
- Если один аккаунт - можно не передавать `merchant_uuid` в запросах
