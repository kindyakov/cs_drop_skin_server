# 📋 Контроллеры - Справочник

## 📗 Описание
Справочник контроллеров проекта с описанием функций в папке `src/controllers/`.

---

## 🔐 Authentication Controller (`auth.controller.ts`)

### Функции аутентификации через OAuth

#### **Steam OAuth**
- **`steamAuth`** - Начало Steam OAuth аутентификации
  - Использует Passport Steam strategy
  - Redirect пользователя на Steam для авторизации
  - Прямой middleware: `passport.authenticate('steam')`

- **`steamCallback`** - Callback после Steam авторизации
  - Обрабатывает ответ от Steam OAuth
  - Passport authenticates user (no session)
  - Генерирует JWT токен: `{ userId, role }`
  - Redirect на frontend с токеном в query параметре
  - URL: `${FRONTEND_URL}/auth/success?token=${token}`

#### **VK OAuth**
- **`vkAuth`** - Начало VK OAuth аутентификации
  - Использует Passport VK strategy
  - Redirect пользователя на VK для авторизации
  - Прямой middleware: `passport.authenticate('vkontakte')`

- **`vkCallback`** - Callback после VK авторизации
  - Обрабатывает ответ от VK OAuth
  - Passport authenticates user (no session)
  - Генерирует JWT токен: `{ userId, role }`
  - Redirect на frontend с токеном в query параметре
  - URL: `${FRONTEND_URL}/auth/success?token=${token}`

#### **User Profile**
- **`getCurrentUser`** - Получение профиля текущего пользователя
  - Требуется JWT токен (authenticate middleware)
  - Search: `prisma.user.findUnique({ where: { id: req.user!.userId } })`
  - Возвращает только публичные поля:
    - `id`, `username`, `avatarUrl`, `balance`, `role`, `createdAt`
  - Использует `successResponse(res, user)` для ответа
  - Бросает `NotFoundError` если пользователь не найден

### 🛠 Техническая реализация

#### **依赖 (Dependencies):**
```typescript
import { type Request, type Response, type NextFunction } from 'express';
import passport from '../config/passport.config.js';
import { generateToken } from '../utils/jwt.util.js';
import { successResponse } from '../utils/response.util.js';
import { PrismaClient } from '@prisma/client';
import { NotFoundError } from '../utils/errors.util.js';
import { type AuthenticatedRequest } from '../middleware/auth.middleware.js';
```

#### **Prisma Integration:**
- User lookup/creation выполняется в Passport strategy
- `const prisma = new PrismaClient();` для работы с базой
- Selective field selection для возврата только нужных данных

#### **TypeScript Типизация:**
- `AuthenticatedRequest` для протектед роутов
- Использование `type` imports для tree-shaking
- Promise<void> для async функций

### 🌐 OAuth Flow

#### **1. User-initiated OAuth:**
```
GET /auth/steam → Steam → Database → JWT → Frontend Redirect
GET /auth/vk → VK → Database → JWT → Frontend Redirect
```

#### **2. Frontend integration:**
```typescript
// Frontend получает token
window.location.href = `${FRONTEND_URL}/auth/success?token=eyJ...`;

// Сохраняет token для API calls
localStorage.setItem('token', token);

// Использует в запросах
fetch('/api/profile', {
  headers: { 'Authorization': `Bearer ${token}` }
});
```

#### **3. Protected API access:**
```bash
GET /auth/me
Authorization: Bearer eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...
```

### 📍 Роуты (из `auth.routes.ts`)

#### **OAuth Endpoints:**
```typescript
// Steam OAuth
router.get('/steam', authController.steamAuth);
router.get('/steam/return', authController.steamCallback);

// VK OAuth
router.get('/vk', authController.vkAuth);
router.get('/vk/callback', authController.vkCallback);

// Protected
router.get('/me', authenticate, authController.getCurrentUser as RequestHandler);
```

### 🔧 Error Handling

#### **Authentication Errors:**
- `UnauthorizedError` - неверный/отсутствующий JWT токен
- `NotFoundError` - пользователь не найден в базе
- Passport strategy errors (Steam/VK недоступны)

#### **Common Patterns:**
```typescript
try {
  // контроллер логика
} catch (error) {
  next(error); // передаем в centralized error handler
}
```

### 🔄 Token Lifecycle

#### **JWT Payload Structure:**
```typescript
interface JWTPayload {
  userId: string;    // Prisma User.id
  role: UserRole;    // Enum: USER, ADMIN
}
```

#### **Token Generation:**
```typescript
const token = generateToken({ userId: user.id, role: user.role });
// expiresIn: 2h (из utils/jwt.util.ts)
```

### 📝 Примеры использования

#### **Frontend OAuth Integration:**
```javascript
// Начало авторизации
window.location.href = '/api/auth/steam';

// Обработка callback (frontend route)
router.get('/auth/success', (req, res) => {
  const { token } = req.query;
  localStorage.setItem('auth_token', token);
  res.redirect('/dashboard');
});
```

#### **API Usage:**
```typescript
// Получение текущего пользователя
const response = await fetch('/api/auth/me', {
  headers: {
    'Authorization': `Bearer ${token}`
  }
});
const user = await response.json();
```

---

## 🎮 Case Controller (`case.controller.ts`)

### Функции работы с кейсами

#### **Public Case Operations**
- **`getAllCases`** - Получение всех активных кейсов
  - Использует `caseService.getAllActiveCases()`
  - Возвращает список кейсов без предметов
  - Использует `successResponse(res, cases)` для ответа

- **`getCaseBySlug`** - Получение кейса по slug с предметами
  - Извлекает `{ slug }` из `req.params`
  - Вызывает `caseService.getCaseBySlug(slug)`
  - Возвращает кейс с предметами и шансами выпадения
  - Использует `successResponse(res, caseData)` для ответа

### 🛠 Техническая реализация

#### **Dependencies:**
```typescript
import { Request, Response, NextFunction } from 'express';
import * as caseService from '../services/case.service.js';
import { successResponse } from '../utils/index.js';
```

#### **Error Handling:**
```typescript
try {
  // Controller logic
} catch (error) {
  next(error); // Передаем в centralized error handler
}
```

#### **TypeScript Типизация:**
- Стандартные Express типов: Request, Response, NextFunction
- Service функции возвращают ICase[] и ICaseWithItems
- Автоматическая обработка ошибок из NotFoundError

### 📍 Подключенные роуты (из `case.routes.ts`)
```typescript
// Публичные роуты (без авторизации)
router.get('/', caseController.getAllCases);           // GET /api/v1/cases
router.get('/:slug', caseController.getCaseBySlug);     // GET /api/v1/cases/:slug
```

### 🌐 API Endpoint Examples

#### **Получение всех кейсов:**
```bash
GET /api/v1/cases
Response: [
  {
    id: "case1",
    name: "Wildfire Case",
    slug: "wildfire-case",
    imageUrl: "/images/cases/wildfire.png",
    price: 24900,
    isActive: true,
    // ... без предметов
  }
]
```

#### **Получение кейса с предметами:**
```bash
GET /api/v1/cases/wildfire-case
Response: {
  id: "case1",
  name: "Wildfire Case",
  slug: "wildfire-case",
  imageUrl: "/images/cases/wildfire.png",
  price: 24900,
  isActive: true,
  items: [
    {
      id: "ci1",
      chancePercent: 0.1,
      item: {
        id: "item1",
        displayName: "AWP Dragon Lore",
        marketHashName: "AWP | Dragon Lore",
        imageUrl: "/images/items/awp_dragon_lore.png",
        price: 8500000,
        rarity: "COVERT"
      }
    }
  ]
}
```

### ⚠️ Особенности реализации

#### **Только чтение:**
- **Нет POST/PUT/DELETE** операций (для будущих админ роутов)
- **Нет middleware авторизации** - публичный доступ
- **Нет валидации** - простые параметры

#### **Dependencies от сервисов:**
- Полностью relies на `case.service.ts` для бизнес-логики
- Нет прямых Prisma запросов в контроллере
- Чистая сепарация: Controller → Service → Database

---

## 🎯 Case Opening Controller (`caseOpening.controller.ts`)

### Функции открытия кейсов

#### **Case Opening Operations**
- **`openCase`** - Открытие кейса
  - Использует `AuthenticatedRequest` для доступа к `userId`
  - Извлекает `{ caseId }` из `req.body`
  - Вызывает `caseOpeningService.openCase(userId, caseId)`
  - Возвращает `ICaseOpeningResult` с данными выпавшего предмета
  - Использует `successResponse(res, result, 'Кейс успешно открыт')`

- **`getRecentOpenings`** - Последние открытия для live-ленты
  - Извлекает `limit` из `req.query` (по умолчанию 20)
  - Вызывает `caseOpeningService.getRecentOpenings(limit)`
  - Возвращает массив `ILiveFeedEvent` для live-ленты
  - Публичный эндпоинт без авторизации

### 🛠 Техническая реализация

#### **Dependencies:**
```typescript
import { Request, Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../middleware/auth.middleware.js';
import * as caseOpeningService from '../services/caseOpening.service.js';
import { successResponse } from '../utils/index.js';
```

#### **Route Protection:**
- **`openCase`** - Требует JWT аутентификацию (`AuthenticatedRequest`)
- **`getRecentOpenings`** - Публичный доступ без авторизации
- Rate limiting через middleware для защиты от abuse

#### **Error Handling:**
```typescript
try {
  // Controller logic
} catch (error) {
  next(error); // Передаем в centralized error handler
}
```

### 📍 Подключенные роуты (из `caseOpening.routes.ts`)
```typescript
// Открытие кейса (защищено + rate limit)
router.post('/open', authenticate, caseOpeningRateLimiter, caseOpeningController.openCase);

// Live-лента (публичный endpoint)  
router.get('/recent', caseOpeningController.getRecentOpenings);
```

### 🌐 API Endpoint Examples

#### **Открытие кейса:**
```bash
POST /api/v1/openings/open
Authorization: Bearer eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...
Content-Type: application/json

{
  "caseId": "case123"
}

Response:
{
  "success": true,
  "data": {
    "success": true,
    "item": {
      "id": "item456",
      "displayName": "AWP Dragon Lore",
      "marketHashName": "AWP | Dragon Lore",
      "imageUrl": "/images/items/awp_dragon_lore.png",
      "price": 8500000,
      "rarity": "COVERT"
    },
    "newBalance": 75100
  },
  "message": "Кейс успешно открыт"
}
```

#### **Live-лента:**
```bash
GET /api/v1/openings/recent?limit=10
Response:
{
  "success": true,
  "data": [
    {
      "id": "opening1",
      "username": "player123",
      "userAvatar": "/images/avatars/player123.png",
      "caseName": "Wildfire Case",
      "caseImage": "/images/cases/wildfire.png",
      "itemName": "AK-47 Redline",
      "itemImage": "/images/items/ak_redline.png",
      "itemRarity": "CLASSIFIED",
      "openedAt": "2025-10-17T19:30:00.000Z"
    }
  ]
}
```

### ⚠️ Особенности реализации

#### **Безопасность транзакций:**
- **Prisma `$transaction`** для атомарности операций
- **Баланс проверяется и списывается** в одной транзакции
- **Предмет добавляется в инвентарь** атомарно
- **История записывается** одновременно

#### **Rate Limiting:**
- **`caseOpeningRateLimiter`** для защиты от спама
- **JWT аутентификация** для проверки пользователя
- **Публичный доступ** только к live-ленте

#### **Алгоритм выпадения:**
- **Weighted random selection** с учетом шансов
- **Криптографический генератор** `Math.random()`
- **Накопительные интервалы** для правильного распределения

---

## 📝 Паттерны проектирования

### **Controller Structure:**
1. **Dependencies imports** - все зависимости вверху
2. **Initialization** - Prisma client
3. **Export functions** - каждая функция как middleware
4. **Error handling** - try/catch с next(error)
5. **Type safety** - строгие типы везде

### **Dependencies Management:**
- Express types (Request, Response, NextFunction)
- Passport auth strategies  
- JWT utils для токенов
- Prisma для DB
- Utils для response/error handling
- Middleware types для роутов

---

## 👤 User Controller (`user.controller.ts`)

### Функции работы с профилем пользователя

#### **User Profile Operations**
- **`getInventory`** - Получение инвентаря пользователя
  - Использует `AuthenticatedRequest` для доступа к `userId`
  - Вызывает `userService.getUserInventory(userId)`
  - Возвращает массив предметов со статусом `OWNED`
  - Сортирует по `acquiredAt` (новые первыми)
  - Использует `successResponse(res, inventory)` для ответа

- **`getOpeningsHistory`** - Получение истории открытий кейсов
  - Использует `AuthenticatedRequest` для доступа к `userId`
  - Извлекает `limit` из `req.query` (по умолчанию 50)
  - Вызывает `userService.getUserOpenings(userId, limit)`
  - Возвращает историю открытий с деталями кейсов и предметов
  - Использует `successResponse(res, history)` для ответа

### 🛠 Техническая реализация

#### **Dependencies:**
```typescript
import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../middleware/auth.middleware.js';
import * as userService from '../services/user.service.js';
import { successResponse } from '../utils/index.js';
```

#### **Route Protection:**
- **Все роуты требуют JWT аутентификацию** (`AuthenticatedRequest`)
- Извлечение `userId` из `req.user!.userId`
- Стандартная обработка ошибок через `next(error)`

### 📍 Подключенные роуты (из `user.routes.ts`)
```typescript
// Все роуты требуют авторизации
router.get('/inventory', authenticate, userController.getInventory);
router.get('/history', authenticate, userController.getOpeningsHistory);
```

### 🌐 API Endpoint Examples

#### **Получение инвентаря:**
```bash
GET /api/v1/users/inventory
Authorization: Bearer eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...

Response:
{
  "success": true,
  "data": [
    {
      "id": "userItem1",
      "userId": "user123",
      "itemId": "item456",
      "acquiredAt": "2025-10-17T19:30:00.000Z",
      "status": "OWNED",
      "item": {
        "id": "item456",
        "displayName": "AWP Dragon Lore",
        "marketHashName": "AWP | Dragon Lore",
        "imageUrl": "/images/items/awp_dragon_lore.png",
        "price": 8500000,
        "rarity": "COVERT"
      }
    }
  ]
}
```

#### **Получение истории открытий:**
```bash
GET /api/v1/users/history?limit=10
Authorization: Bearer eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...

Response:
{
  "success": true,
  "data": [
    {
      "id": "opening1",
      "userId": "user123",
      "caseId": "case1",
      "itemId": "item456",
      "openedAt": "2025-10-17T19:30:00.000Z",
      "case": {
        "name": "Wildfire Case",
        "imageUrl": "/images/cases/wildfire.png"
      },
      "item": {
        "displayName": "AWP Dragon Lore",
        "imageUrl": "/images/items/awp_dragon_lore.png",
        "rarity": "COVERT",
        "price": 8500000
      }
    }
  ]
}
```

### ⚠️ Особенности реализации

#### **Безопасность:**
- **JWT аутентификация** обязательна для всех роутов
- **Фильтрация по userId** - пользователи видят только свои данные
- **Нет POST/PUT/DELETE** - только операции чтения

#### **Оптимизация запросов:**
- **Selective includes** для загрузки связанных данных
- **Ordering** для релевантной сортировки
- **Limit** для контроля размера ответа

---

## 💳 Payment Controller (`payment.controller.ts`)

### Функции работы с платежами

#### **Payment Operations**
- **`createPayment`** - Создание платежа для пополнения баланса
  - Использует `AuthenticatedRequest` для доступа к `userId`
  - Извлекает `{ amount }` из `req.body`
  - Вызывает `paymentService.createPayment()`
  - Возвращает `{ confirmationUrl, transactionId }` для редиректа на оплату
  - Использует `successResponse(res, result, 'Платёж создан')`

- **`webhookHandler`** - Обработка webhook от YooKassa
  - Публичный endpoint (без авторизации)
  - Извлекает `IYooKassaWebhook` из `req.body`
  - Вызывает `paymentService.processWebhook(webhook)`
  - Возвращает `res.status(200).send('OK')` - требование YooKassa
  - Автоматически зачисляет средства при успешной оплате

- **`getUserTransactions`** - История транзакций пользователя
  - Использует `AuthenticatedRequest` для доступа к `userId`
  - Извлекает `limit` из `req.query` (по умолчанию 50)
  - Делает Prisma запрос к `transaction` таблице
  - Фильтрует по `userId` и сортирует по `createdAt` (desc)
  - Использует `successResponse(res, transactions)`

### 🛠 Техническая реализация

#### **Dependencies:**
```typescript
import { Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';
import { AuthenticatedRequest } from '../middleware/auth.middleware.js';
import * as paymentService from '../services/payment.service.js';
import { successResponse } from '../utils/index.js';
import type { IYooKassaWebhook } from '../types/payment.types.js';

const prisma = new PrismaClient();
```

#### **Route Protection:**
- **`createPayment`** - Требует JWT + paymentRateLimiter (5 req/min)
- **`webhookHandler`** - Публичный (YooKassa webhook endpoint)
- **`getUserTransactions`** - Требует JWT аутентификацию

### 📍 Подключенные роуты (из `payment.routes.ts`)
```typescript
// Создание платежа
router.post('/create', authenticate, paymentRateLimiter, paymentController.createPayment);

// YooKassa webhook
router.post('/webhook', paymentController.webhookHandler);

// История транзакций
router.get('/transactions', authenticate, paymentController.getUserTransactions);
```

### 🌐 API Endpoint Examples

#### **Создание платежа:**
```bash
POST /api/v1/payments/create
Authorization: Bearer eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...
Content-Type: application/json

{
  "amount": 10000
}

Response:
{
  "success": true,
  "data": {
    "confirmationUrl": "https://yoomoney.ru/checkout/payments/v2/...",
    "transactionId": "trans123"
  },
  "message": "Платёж создан"
}
```

#### **История транзакций:**
```bash
GET /api/v1/payments/transactions?limit=20
Authorization: Bearer eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...

Response:
{
  "success": true,
  "data": [
    {
      "id": "trans123",
      "userId": "user456",
      "amount": 10000,
      "type": "DEPOSIT",
      "status": "COMPLETED",
      "paymentId": "yookassa_payment_id",
      "createdAt": "2025-10-17T19:30:00.000Z"
    }
  ]
}
```

### ⚠️ Особенности реализации

#### **Безопасность:**
- **paymentRateLimiter** (5 req/min) для защиты от спама
- **JWT аутентификация** для create и transactions endpoints
- **Webhook без аутентификации** - YooKassa сервисный endpoint

#### **Интеграция с YooKassa:**
- **createPayment** создаёт платёж и возвращает URL для редиректа
- **webhookHandler** обрабатывает уведомления автоматически
- **Транзакции** атомарны через Prisma `$transaction`

---

## 🔐 Admin Case Controller (`admin/adminCase.controller.ts`)

### Функции управления кейсами (Admin)

#### **Admin Case Operations**
- **`createCase`** - Создание нового кейса
  - Использует `AuthenticatedRequest` (требуется admin права)
  - Извлекает `ICreateCaseInput` из `req.body`
  - Вызывает `adminCaseService.createCase(input)`
  - Возвращает созданный кейс со статусом 201
  - Использует `successResponse(res, newCase, 'Кейс успешно создан', 201)`

- **`updateCase`** - Обновление существующего кейса
  - Извлекает `id` из `req.params`
  - Извлекает `IUpdateCaseInput` из `req.body`
  - Вызывает `adminCaseService.updateCase(id, input)`
  - Автоматически обновляет slug при изменении name
  - Использует `successResponse(res, updatedCase, 'Кейс успешно обновлён')`

- **`deleteCase`** - Soft delete кейса
  - Извлекает `id` из `req.params`
  - Вызывает `adminCaseService.deleteCase(id)`
  - Устанавливает isActive = false
  - Использует `successResponse(res, null, 'Кейс успешно удалён')`

- **`addItemsToCase`** - Добавление предметов в кейс
  - Извлекает `id` из `req.params`
  - Извлекает `IAddItemsToCaseInput` из `req.body`
  - Вызывает `adminCaseService.addItemsToCase(id, input)`
  - Валидирует сумму шансов = 100% в сервисе
  - Возвращает кейс с добавленными предметами

### 🛠 Техническая реализация

#### **Dependencies:**
```typescript
import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../../middleware/auth.middleware.js';
import * as adminCaseService from '../../services/admin/adminCase.service.js';
import { successResponse } from '../../utils/index.js';
```

#### **Route Protection:**
- **Все роуты требуют:**
  - `authenticate` - JWT аутентификация
  - `requireAdmin` - роль ADMIN
  - `adminRateLimiter` - 50 req/min
- **Валидация:**
  - `validateCreateCase` для POST /
  - `validateUpdateCase` для PUT /:id
  - `validateAddItemsToCase` для POST /:id/items

### 📍 Подключенные роуты (из `admin/adminCase.routes.ts`)
```typescript
// Все роуты с префиксом /api/v1/admin/cases
router.post('/', authenticate, requireAdmin, adminRateLimiter, validateCreateCase, controller.createCase);
router.put('/:id', authenticate, requireAdmin, adminRateLimiter, validateUpdateCase, controller.updateCase);
router.delete('/:id', authenticate, requireAdmin, adminRateLimiter, controller.deleteCase);
router.post('/:id/items', authenticate, requireAdmin, adminRateLimiter, validateAddItemsToCase, controller.addItemsToCase);
```

### 🌐 API Endpoint Examples

#### **Создание кейса:**
```bash
POST /api/v1/admin/cases
Authorization: Bearer eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...
Content-Type: application/json

{
  "name": "Danger Zone Case",
  "description": "Новый кейс с редкими предметами",
  "imageUrl": "/images/cases/danger-zone.png",
  "price": 24900,
  "isActive": true
}

Response:
{
  "success": true,
  "data": {
    "id": "case123",
    "name": "Danger Zone Case",
    "slug": "danger-zone-case",
    "description": "Новый кейс с редкими предметами",
    "imageUrl": "/images/cases/danger-zone.png",
    "price": 24900,
    "isActive": true,
    "createdAt": "2025-10-17T19:30:00.000Z"
  },
  "message": "Кейс успешно создан"
}
```

#### **Обновление кейса:**
```bash
PUT /api/v1/admin/cases/case123
Authorization: Bearer eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...
Content-Type: application/json

{
  "price": 29900,
  "isActive": false
}

Response:
{
  "success": true,
  "data": {
    "id": "case123",
    "price": 29900,
    "isActive": false,
    ...
  },
  "message": "Кейс успешно обновлён"
}
```

#### **Добавление предметов в кейс:**
```bash
POST /api/v1/admin/cases/case123/items
Authorization: Bearer eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...
Content-Type: application/json

{
  "items": [
    { "itemId": "item1", "chancePercent": 79.92 },
    { "itemId": "item2", "chancePercent": 15.98 },
    { "itemId": "item3", "chancePercent": 3.2 },
    { "itemId": "item4", "chancePercent": 0.64 },
    { "itemId": "item5", "chancePercent": 0.26 }
  ]
}

Response:
{
  "success": true,
  "data": {
    "id": "case123",
    "name": "Danger Zone Case",
    "items": [...]
  },
  "message": "Предметы успешно добавлены в кейс"
}
```

### ⚠️ Особенности реализации

#### **Безопасность:**
- **Triple protection:** authenticate + requireAdmin + adminRateLimiter
- **Детальное логирование** всех админских действий
- **Валидация входных данных** через express-validator

#### **Бизнес-логика:**
- **Автоматическая генерация slug** из name
- **Soft delete** - кейсы не удаляются из БД
- **Валидация шансов = 100%** при добавлении предметов

---

## 📁 Admin Category Controller (`admin/adminCategory.controller.ts`)

### Функции управления категориями (Admin)

#### **Admin Category Operations**
- **`getAllCategories`** - Получение всех категорий
  - Публичный для админов (не требует AuthenticatedRequest)
  - Вызывает `adminCategoryService.getAllCategories()`
  - Возвращает массив категорий с количеством кейсов
  - Сортирует по полю order (ASC)
  - Использует `successResponse(res, categories)`

- **`getCategoryById`** - Получение категории с кейсами
  - Извлекает `id` из `req.params`
  - Вызывает `adminCategoryService.getCategoryById(id)`
  - Возвращает категорию с полным списком кейсов
  - Использует `successResponse(res, category)`

- **`createCategory`** - Создание новой категории
  - Использует `AuthenticatedRequest` (требуется admin права)
  - Извлекает `ICreateCategoryInput` из `req.body`
  - Вызывает `adminCategoryService.createCategory(input)`
  - Автоматически генерирует slug из name
  - Возвращает созданную категорию со статусом 201
  - Использует `successResponse(res, newCategory, 'Категория успешно создана', 201)`

- **`updateCategory`** - Обновление категории
  - Извлекает `id` из `req.params`
  - Извлекает `IUpdateCategoryInput` из `req.body`
  - Вызывает `adminCategoryService.updateCategory(id, input)`
  - Автоматически обновляет slug при изменении name
  - Использует `successResponse(res, updatedCategory, 'Категория успешно обновлена')`

- **`deleteCategory`** - Soft delete категории
  - Извлекает `id` из `req.params`
  - Вызывает `adminCategoryService.deleteCategory(id)`
  - Убирает категорию у всех кейсов (categoryId = null)
  - Устанавливает isActive = false
  - Использует `successResponse(res, null, 'Категория успешно удалена')`

- **`assignCasesToCategory`** - Назначение кейсов категории
  - Извлекает `id` из `req.params`
  - Извлекает `IAssignCasesToCategoryInput` из `req.body`
  - Вызывает `adminCategoryService.assignCasesToCategory(id, input)`
  - Обновляет categoryId у всех указанных кейсов
  - Возвращает категорию с обновлённым списком кейсов

### 🛠 Техническая реализация

#### **Dependencies:**
```typescript
import { Request, Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../../middleware/auth.middleware.js';
import * as adminCategoryService from '../../services/admin/adminCategory.service.js';
import { successResponse } from '../../utils/index.js';
```

#### **Route Protection:**
- **Все роуты требуют:**
  - `authenticate` - JWT аутентификация
  - `requireAdmin` - роль ADMIN
  - `adminRateLimiter` - 50 req/min
- **Валидация:**
  - `validateCreateCategory` для POST /
  - `validateUpdateCategory` для PUT /:id
  - `validateAssignCases` для POST /:id/assign-cases

### 📍 Подключенные роуты (из `admin/adminCategory.routes.ts`)
```typescript
// Все роуты с префиксом /api/v1/admin/categories
router.get('/', controller.getAllCategories);
router.get('/:id', controller.getCategoryById);
router.post('/', authenticate, requireAdmin, adminRateLimiter, validateCreateCategory, controller.createCategory);
router.put('/:id', authenticate, requireAdmin, adminRateLimiter, validateUpdateCategory, controller.updateCategory);
router.delete('/:id', authenticate, requireAdmin, adminRateLimiter, controller.deleteCategory);
router.post('/:id/assign-cases', authenticate, requireAdmin, adminRateLimiter, validateAssignCases, controller.assignCasesToCategory);
```

### 🌐 API Endpoint Examples

#### **Получение всех категорий:**
```bash
GET /api/v1/admin/categories
Authorization: Bearer eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...

Response:
{
  "success": true,
  "data": [
    {
      "id": "cat1",
      "name": "Популярные кейсы",
      "slug": "populyarnye-keysy",
      "description": "Самые популярные кейсы",
      "imageUrl": "/images/categories/popular.png",
      "order": 0,
      "isActive": true,
      "_count": {
        "cases": 5
      }
    }
  ]
}
```

#### **Создание категории:**
```bash
POST /api/v1/admin/categories
Authorization: Bearer eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...
Content-Type: application/json

{
  "name": "Новые кейсы",
  "description": "Недавно добавленные кейсы",
  "imageUrl": "/images/categories/new.png",
  "order": 1
}

Response:
{
  "success": true,
  "data": {
    "id": "cat2",
    "name": "Новые кейсы",
    "slug": "novye-keysy",
    "description": "Недавно добавленные кейсы",
    "imageUrl": "/images/categories/new.png",
    "order": 1,
    "isActive": true
  },
  "message": "Категория успешно создана"
}
```

#### **Назначение кейсов категории:**
```bash
POST /api/v1/admin/categories/cat1/assign-cases
Authorization: Bearer eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...
Content-Type: application/json

{
  "caseIds": ["case1", "case2", "case3"]
}

Response:
{
  "success": true,
  "data": {
    "id": "cat1",
    "name": "Популярные кейсы",
    "cases": [
      {
        "id": "case1",
        "name": "Wildfire Case",
        "slug": "wildfire-case",
        "imageUrl": "/images/cases/wildfire.png",
        "price": 24900,
        "isActive": true
      },
      ...
    ]
  },
  "message": "Кейсы успешно назначены категории"
}
```

### ⚠️ Особенности реализации

#### **Безопасность:**
- **Triple protection:** authenticate + requireAdmin + adminRateLimiter
- **Детальное логирование** всех админских действий
- **Валидация входных данных** через express-validator

#### **Бизнес-логика:**
- **Автоматическая генерация slug** из name
- **Soft delete** - категории не удаляются из БД
- **SetNull для кейсов** - при удалении категории кейсы остаются
- **Сортировка по order** - гибкое управление позициями

---

## 👥 Admin User Controller (`admin/adminUser.controller.ts`)

### Функции управления пользователями (Admin)

#### **Admin User Operations**
- **`getAllUsers`** - Получение списка пользователей
  - Извлекает фильтры из query параметров
  - Вызывает `adminUserService.getAllUsers(filters)`
  - Поддерживает фильтрацию по role и search
  - Поддерживает пагинацию через limit/offset
  - Использует `successResponse(res, users)`

- **`toggleUserBlock`** - Блокировка/разблокировка пользователя
  - Извлекает `id` из `req.params`
  - Вызывает `adminUserService.toggleUserBlock(id)`
  - Переключает статус isBlocked
  - Динамическое сообщение в зависимости от нового статуса
  - Использует `successResponse(res, updatedUser, message)`

- **`updateUserBalance`** - Обновление баланса пользователя
  - Извлекает `id` из `req.params`
  - Извлекает `IUpdateUserBalanceInput` из `req.body`
  - Вызывает `adminUserService.updateUserBalance(id, input)`
  - Создаёт транзакцию для истории
  - Использует `successResponse(res, updatedUser, 'Баланс пользователя обновлён')`

### 🛠 Техническая реализация

#### **Dependencies:**
```typescript
import { Request, Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../../middleware/auth.middleware.js';
import * as adminUserService from '../../services/admin/adminUser.service.js';
import { successResponse } from '../../utils/index.js';
import type { IGetUsersFilters } from '../../types/admin.types.js';
```

#### **Route Protection:**
- **Все роуты требуют:**
  - `authenticate` - JWT аутентификация
  - `requireAdmin` - роль ADMIN
  - `adminRateLimiter` - 50 req/min
- **Валидация:**
  - `validateUpdateUserBalance` для PATCH /:id/balance

### 📍 Подключенные роуты (из `admin/adminUser.routes.ts`)
```typescript
// Все роуты с префиксом /api/v1/admin/users
router.get('/', controller.getAllUsers);
router.patch('/:id/toggle-block', controller.toggleUserBlock);
router.patch('/:id/balance', authenticate, requireAdmin, adminRateLimiter, validateUpdateUserBalance, controller.updateUserBalance);
```

### 🌐 API Endpoint Examples

#### **Получение списка пользователей:**
```bash
GET /api/v1/admin/users?role=USER&search=john&limit=20&offset=0
Authorization: Bearer eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...

Response:
{
  "success": true,
  "data": [
    {
      "id": "user1",
      "username": "john_doe",
      "avatarUrl": "/avatars/john.png",
      "balance": 50000,
      "role": "USER",
      "isBlocked": false,
      "createdAt": "2025-10-17T19:30:00.000Z"
    }
  ]
}
```

#### **Блокировка пользователя:**
```bash
PATCH /api/v1/admin/users/user1/toggle-block
Authorization: Bearer eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...

Response:
{
  "success": true,
  "data": {
    "id": "user1",
    "username": "john_doe",
    "isBlocked": true,
    ...
  },
  "message": "Пользователь заблокирован"
}
```

#### **Обновление баланса:**
```bash
PATCH /api/v1/admin/users/user1/balance
Authorization: Bearer eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...
Content-Type: application/json

{
  "amount": 10000,
  "reason": "Компенсация за баг"
}

Response:
{
  "success": true,
  "data": {
    "id": "user1",
    "username": "john_doe",
    "balance": 60000,
    ...
  },
  "message": "Баланс пользователя обновлён"
}
```

### ⚠️ Особенности реализации

#### **Безопасность:**
- **Защита от блокировки админов** - нельзя заблокировать ADMIN
- **Проверка баланса** - не допускает отрицательных значений
- **История операций** - все изменения баланса записываются

#### **Блокировка:**
- Заблокированные пользователи проверяются через `checkUserBlocked` middleware
- Блокировка применяется к критичным операциям (открытие кейсов, платежи)

---

## 🚀 Future Controllers (Планируемые)

### **AdminPanelController** - админ функции
- CRUD операций для кейсов
- Управление предметами
- Аналитика и статистика

---

## 📦 Совместимость

### **Middleware Integration:**
- `authenticate` для JWT проверки
- Error handling через centralized handler
- Response standardization через utils

### **Database Integration:**
- Prisma User model
- Role-based access control
- Transaction logging (future)

### **Frontend Integration:**
- JWT токен в HTTP headers
- Standardized response format
- HTTP status codes consistency

---

*Последнее обновление: 17.10.2025*
