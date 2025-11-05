# План реализации интеграции Exnode

## 📦 Изменения в Prisma Schema

### 1. Обновить модель `Transaction`

**Файл**: `prisma/schema.prisma`

**Добавить**:

```prisma
enum PaymentProvider {
  EXNODE
  YOOKASSA  // на будущее если понадобится
}

model Transaction {
  // ... существующие поля
  provider    PaymentProvider @default(EXNODE)  // новое поле
  trackerId   String?         @unique           // новое поле - для Exnode
  cryptoAmount Decimal?       @db.Decimal(18, 8) // новое поле - сумма в крипте
  fiatCurrency String?                           // новое поле - валюта (RUB/USD)
}
```

**После изменения**:

```bash
npm run prisma:generate
npm run prisma:migrate
```

---

## 📁 Новые файлы

### 1. **Service**: `src/services/exnode.service.ts`

Функции:

- `generateSignature(timestamp, body)` - создание HMAC подписи
- `createPayment(userId, amount, fiatCurrency)` - создать Order
- `getOrderInfo(trackerId)` - получить статус ордера
- `processWebhook(trackerId)` - обработка webhook

---

### 2. **Controller**: `src/controllers/exnode.controller.ts`

Обработчики:

- `createPayment()` - POST /api/v1/payments/exnode
- `webhook()` - POST /api/v1/payments/exnode/webhook

---

### 3. **Routes**: `src/routes/exnode.routes.ts`

Роуты:

- `POST /api/v1/payments/exnode` - создать платеж (требует auth)
- `POST /api/v1/payments/exnode/webhook` - webhook (БЕЗ auth)

---

### 4. **Types**: `src/types/exnode.types.ts`

TypeScript интерфейсы:

- `IExnodeCreateOrderRequest`
- `IExnodeCreateOrderResponse`
- `IExnodeGetOrderResponse`
- `IExnodeWebhook`

---

## 🔧 Обновить существующие файлы

### 1. **Config**: `src/config/env.config.ts`

Добавить валидацию для:

```typescript
exnode: {
  privateKey: z.string(),
  publicKey: z.string(),
  apiUrl: z.string().url(),
  merchantId: z.string().optional(),
}
```

---

### 2. **Routes**: `src/routes/index.ts`

Подключить новый роут:

```typescript
import exnodeRoutes from './exnode.routes';
app.use('/api/v1/payments/exnode', exnodeRoutes);
```

---

## 🎯 Логика работы

### Backend Flow:

#### 1. Создание платежа

```
User → POST /api/v1/payments/exnode { amount: 3000, currency: "RUB" }
  ↓
Controller проверяет auth → вызывает exnodeService.createPayment()
  ↓
Service:
  1. Генерирует client_transaction_id (UUID)
  2. Создает Transaction в БД (PENDING, provider=EXNODE)
  3. Генерирует signature
  4. POST запрос к Exnode API
  5. Получает payment_url и tracker_id
  6. Обновляет Transaction (trackerId)
  7. Возвращает { payment_url, transaction_id }
  ↓
Frontend получает payment_url → редирект пользователя
```

#### 2. Webhook обработка

```
Exnode → POST /api/v1/payments/exnode/webhook { tracker_id }
  ↓
Controller вызывает exnodeService.processWebhook(tracker_id)
  ↓
Service:
  1. Запрашивает GET /api/crypto/invoice/get?tracker_id=...
  2. Получает статус ордера
  3. Находит Transaction по trackerId
  4. Если status === "SUCCESS":
     - Начинает транзакцию БД
     - Обновляет User.balance
     - Обновляет Transaction.status → COMPLETED
     - Коммит транзакции
  5. Если status === "EXPIRED" или "ERROR":
     - Обновляет Transaction.status → FAILED
  ↓
Response 200 OK (обязательно!)
```

---

## 🔐 Безопасность

### ⚠️ ВАЖНО:

1. **НЕ проверяем подпись в webhook** (Exnode не отправляет signature в webhook)
2. **Всегда делаем дополнительный запрос** к API для проверки статуса
3. **Используем idempotency** - проверяем Transaction.status перед обновлением

---

## 📊 Frontend изменения (кратко)

### Страница пополнения:

```typescript
// 1. Форма ввода суммы (в рублях)
<input type="number" min="100" placeholder="Сумма в рублях" />

// 2. Кнопка "Пополнить"
onClick={() => {
  const response = await fetch('/api/v1/payments/exnode', {
    method: 'POST',
    body: JSON.stringify({ amount: 3000, currency: 'RUB' })
  });
  const { payment_url } = await response.json();
  window.location.href = payment_url; // редирект на форму Exnode
}}
```

---

## ✅ Минимальные требования

### Amount:

- **Минимум**: 100₽ (~ 1.5 USDT)
- **Рекомендуемый минимум**: 300₽ (~ 5 USDT)

### Валюта:

- Пока **только USDT (TRC-20)**
- Token: `USDTTRC`
- Fiat currency: `RUB`

---

## 🧪 Тестирование

### 1. Локальное тестирование webhook:

Использовать **ngrok** или **webhook.site** для получения публичного URL

### 2. Процесс:

1. Запустить сервер локально
2. Создать платеж через API
3. Получить payment_url
4. Оплатить (или симулировать в тестовом режиме Exnode)
5. Проверить что webhook пришел
6. Проверить что баланс зачислен

---

## 📝 Порядок разработки

1. ✅ Изменить Prisma schema → миграция
2. ✅ Создать `exnode.types.ts` с интерфейсами
3. ✅ Создать `exnode.service.ts` с логикой
4. ✅ Создать `exnode.controller.ts` с обработчиками
5. ✅ Создать `exnode.routes.ts` с роутами
6. ✅ Обновить `env.config.ts` с валидацией
7. ✅ Подключить роуты в `routes/index.ts`
8. ✅ Протестировать создание платежа
9. ✅ Протестировать webhook
10. ✅ Интегрировать с фронтендом

---

## 🚀 Готово к реализации!
