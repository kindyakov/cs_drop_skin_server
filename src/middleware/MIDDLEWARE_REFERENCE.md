# Middleware Reference

## 📋 Описание
Справочник middleware проекта с описанием функций в папке `src/middleware/`.

---

## 🔒 Security Middleware (`security.middleware.ts`)

### Функции безопасности
- **`securityMiddleware`** - Helmet security headers
  - CSP, HSTS, XSS Protection, Frame Options
  - CSP Policy: само-контент, только доверенные источники
  - Различные настройки для development/production

- **`corsMiddleware`** - CORS конфигурация
  - Динамическая валидация origin из конфига
  - Development: разрешает любой origin
  - Production: строгая проверка
  - Поддержка credentials и preflight запросов

- **`websocketSecurityMiddleware`** - Безопасность WebSocket
  - Проверка Origin для WebSocketupgrade запросов
  - Разная политика для development/production

- **`apiSecurityHeadersMiddleware`** - Дополнительные заголовки API
  - X-API-Version, X-Content-Type-Options, X-Frame-Options
  - Отключение кеширования для API endpoints

---

## ⏱️ Rate Limiter Middleware (`rateLimiter.middleware.ts`)

### Rate Limiters
- **`generalRateLimiter`** - Общий лимитер
  - 100 запросов в минуту
  - Применяется к /api/* роутам
  - X-RateLimit-* заголовки

- **`authRateLimiter`** - Аутентификация
  - 5 запросов в минуту
  - Против брутфорса паролей
  - IP-based ключ

- **`caseOpeningRateLimiter`** - Открытие кейсов
  - 10 запросов в минуту
  - Защита от спама открытием

- **`paymentRateLimiter`** - Платежи
  - 5 запросов в минуту
  - User ID или IP-based ключ

- **`registrationRateLimiter`** - Регистрация
  - 3 регистрации в час
  - IP-based для предотвращения мультиаккаунтов

- **`passwordResetRateLimiter`** - Сброс пароля
  - 3 запроса в час
  - IP + email комбинация

- **`oauthRateLimiter`** - OAuth callbacks
  - 20 запросов в минуту
  - Для /auth/* роутов

- **`adminRateLimiter`** - Admin панель
  - 50 запросов в минуту
  - Только для пользователей с role: 'admin'

- **`websocketRateLimiter`** - WebSocket соединения
  - 10 соединений в минуту
  - IP-based ключ

- **`createUserRateLimiter(maxRequests, windowMs)**** - Динамический
  - Кастомные лимиты по параметрам

---

## 📝 Logger Middleware (`logger.middleware.ts`)

### Winston Logger
- **`logger`** - Основной логгер
  - Levels: error, warn, info, debug
  - Файловые логи: error.log, combined.log
  - Rotation и обработка исключений
  - Console output для development

### HTTP Logging
- **`morganMiddleware`** - HTTP запросы
  - Интеграция с Winston
  - Разные форматы для dev/prod
  - Пропуск health check в production

### Request Middleware
- **`requestLoggerMiddleware`** - Детальное логирование запросов
  - Trace ID для отслеживания
  - Начало и окончание запроса
  - Duration tracking

- **`performanceLoggerMiddleware`** - Производительность
  - Медленные запросы (> 1s)
  - Очень медленные (> 5s)
  - С hrtime для точности

### Utility Functions
- **`userActionLogger(action)`** - Логирование действий пользователя
- **`securityLogger(event, details)`** - Security события
- **`businessLogger(event, details)`** - Бизнес события

---

## 🔐 Authentication Middleware (`auth.middleware.ts`)

### JWT Authentication
- **`authenticate`** - Основное middleware аутентификации
  - Извлечение и верификация JWT токена из `Authorization: Bearer <token>`
  - Добавление `req.user = { userId, role }` после успешной верификации
  - Использует `verifyToken()` из utils/jwt.util.ts
  - Бросает `UnauthorizedError` при отсутствии или неверном токене

### **`optionalAuth`** - Опциональная аутентификация
- Проверяет JWT токен если он присутствует в заголовке
- НЕ требует обязательного наличия токена
- Если токен валиден - устанавливает `req.user`
- Если токена нет - просто продолжает выполнение
- Если токен невалиден - продолжает без `req.user` (не возвращает 401)
- **Использование:** Для endpoints которые работают и без авторизации, но меняют поведение при её наличии
- **Пример:**
```typescript
  // Профиль доступен всем, но авторизованный видит больше данных
  router.get('/:id', optionalAuth, controller.getUser);
```

### Role-Based Access Control
- **`requireRole(...roles)`** - Factory function для middleware с ролевой проверкой
  - Принимает массив ролей (например: `requireRole(UserRoles.ADMIN)`)
  - Проверяет наличие `req.user` и соответствие его роли требуемым
  - Бросает `UnauthorizedError` если пользователь не аутентифицирован
  - Бросает `ForbiddenError` если роль не соответствует требованиям

- **`requireAdmin`** - Высокоуровневый middleware для admin доступа
  - Является алиасом для `requireRole(UserRoles.ADMIN)`
  - Используется для защиты admin-only роутов
  - **Детальное логирование:**
    - `warn` при попытке доступа без авторизации или прав
    - `info` при успешном доступе
    - Логирует userId, role, IP, path для аудита
  - **Ошибки:**
    - `UnauthorizedError` если пользователь не авторизован
    - `ForbiddenError` если роль не ADMIN

### User Blocking
- **`checkUserBlocked`** - Проверка блокировки пользователя
- Проверяет актуальный статус isBlocked в БД
- Блокирует доступ заблокированным пользователям
- Используется на критичных операциях (открытие кейсов, платежи)
- **Ошибки:**
  - `ForbiddenError` если пользователь заблокирован
- **Логирование:** Записывает попытки доступа заблокированных пользователей
- **Использование:**
```typescript
  router.post('/open', authenticate, checkUserBlocked, controller.openCase);
  router.post('/create', authenticate, checkUserBlocked, controller.createPayment);
```

### TypeScript Типизация
- **`AuthenticatedRequest`** - Расширяет Express.Request с типизированным user
- Строгие типы для `userId: string` и `role: UserRole`
- Type safety во всех функциях middleware

### Примеры использования
```typescript
// Базовая аутентификация
app.get('/api/profile', authenticate, (req, res) => {
  // req.user.userId, req.user.role доступны
});

// Admin-only маршрут
app.delete('/api/users/:id', authenticate, requireAdmin, (req, res) => {
  // Только администратор
});

// Множественные роли
app.get('/api/moderation', authenticate, requireRole(UserRoles.ADMIN, UserRoles.MODERATOR), (req, res) => {
  // Для admin и moderator
});
```

---

## 🚨 Error Handler Middleware (`errorHandler.middleware.ts`)

### Error Classes
- **`AppError`** - Базовая ошибка приложения
- **`ValidationError`** (400) - Ошибки валидации
- **`UnauthorizedError`** (401) - Не авторизован
- **`ForbiddenError`** (403) - Доступ запрещен
- **`NotFoundError`** (404) - Ресурс не найден
- **`ConflictError`** (409) - Конфликт данных
- **`BusinessLogicError`** (422) - Ошибки бизнес-логики
- **`ExternalServiceError`** (502) - Внешние сервисы
- **`ConfigurationError`** - Конфигурация
- **`RateLimitError`** (429) - Limit exceeded

### Error Handling
- **`errorHandler`** - Централизованный обработчик
  - Разные форматы для dev/prod
  - Логирование через Winston
  - Trace ID для отладки

- **`notFoundHandler`** - 404 для неизвестных роутов

### Utility Functions
- **`asyncHandler`** - Async function wrapper
- **`validateResult`** - Валидация результатов
- **`createError`** - Создание кастомных ошибок

---

## ✅ Validation Middleware (`validation.middleware.ts`)

### Валидация входных данных

Использует **express-validator** для проверки данных от пользователя.

#### **`handleValidationErrors`** - Централизованная обработка ошибок валидации

- Проверяет результаты валидации через validationResult(req)
- Собирает все ошибки в одно сообщение
- Бросает ValidationError при наличии ошибок
- Используется во всех валидаторах

#### **`validateCaseOpening`** - Валидация открытия кейса

- **Проверяет:**
  - caseId - обязателен, должен быть строкой
- **Использование:** middleware для POST /openings/open
- **Ошибка:** ValidationError при невалидных данных

#### **`validatePayment`** - Валидация создания платежа

- **Проверяет:**
  - amount - обязателен, минимум 1000 копеек (10 рублей)
- **Использование:** middleware для POST /payments/create
- **Ошибка:** ValidationError при невалидных данных

#### **`validateCreateCase`** - Валидация создания кейса (Admin)
- **Проверяет:**
  - `name` - обязателен, строка, 3-100 символов
  - `imageUrl` - обязателен, строка
  - `price` - обязателен, положительное число в копейках
  - `description` - опциональная строка
  - `isActive` - опциональный boolean
- **Использование:** middleware для POST /admin/cases

#### **`validateUpdateCase`** - Валидация обновления кейса (Admin)
- **Проверяет:**
  - Все поля опциональные
  - Те же правила валидации что и в validateCreateCase
- **Использование:** middleware для PUT /admin/cases/:id

#### **`validateAddItemsToCase`** - Валидация добавления предметов (Admin)
- **Проверяет:**
  - `items` - непустой массив
  - `items[].itemId` - обязателен, строка
  - `items[].chancePercent` - обязателен, float от 0.01 до 100
- **Использование:** middleware для POST /admin/cases/:id/items
- **Примечание:** Сумма шансов валидируется в сервисе (= 100%)

### Примеры использования

```typescript
// В роутах
router.post('/open', authenticate, validateCaseOpening, caseOpeningRateLimiter, controller.openCase);
router.post('/create', authenticate, validatePayment, paymentRateLimiter, controller.createPayment);
```

#### **`validateCreateCategory`** - Валидация создания категории (Admin)
- **Проверяет:**
  - `name` - обязателен, строка, 3-100 символов
  - `description` - опциональная строка
  - `imageUrl` - опциональная строка
  - `order` - опциональное неотрицательное число
  - `isActive` - опциональный boolean
- **Использование:** middleware для POST /admin/categories

#### **`validateUpdateCategory`** - Валидация обновления категории (Admin)
- **Проверяет:**
  - Все поля опциональные
  - Те же правила валидации что и в validateCreateCategory
- **Использование:** middleware для PUT /admin/categories/:id

#### **`validateAssignCases`** - Валидация назначения кейсов (Admin)
- **Проверяет:**
  - `caseIds` - непустой массив строк
  - Каждый элемент массива должен быть строкой
- **Использование:** middleware для POST /admin/categories/:id/assign-cases

#### **`validateUpdateUserBalance`** - Валидация обновления баланса (Admin)
- **Проверяет:**
  - `amount` - обязателен, целое число в копейках
  - `reason` - опциональная строка, max 500 символов
- **Использование:** middleware для PATCH /admin/users/:id/balance

#### **`validateTradeUrl`** - Валидация Steam trade URL
- **Проверяет:**
  - `tradeUrl` - обязателен, строка
  - Формат: `https://steamcommunity.com/tradeoffer/new/?partner=NUMBER&token=STRING`
  - Regex pattern: `/^https:\/\/steamcommunity\.com\/tradeoffer\/new\/\?partner=\d+&token=[a-zA-Z0-9_-]+$/`
- **Использование:** middleware для PATCH /user/trade-url
- **Пример валидного URL:** `https://steamcommunity.com/tradeoffer/new/?partner=123456789&token=AbCdEfGh`

```

### 🔧 Технические детали

#### **Порядок middleware:**

1. **authenticate** - проверка JWT
2. **validate*** - валидация данных
3. **rateLimiter** - защита от спама
4. **controller** - бизнес-логика

#### **Обработка ошибок:**

- Валидация бросает ValidationError (400 status)
- Ошибки перехватываются errorHandler middleware
- Клиент получает стандартизированный ответ

#### **Dependencies:**

```typescript
import { body, param, validationResult } from 'express-validator';
import { ValidationError } from '../utils/index.js';
```

---

## 📦 Экспорт и Использование

```typescript
// Все middleware
import * as Middleware from './index.js';

// Специфичные middleware
import {
  securityMiddleware,
  corsMiddleware,
  generalRateLimiter,
  authRateLimiter,
  errorHandler,
  authenticate,
  requireRole,
  requireAdmin
} from './index.js';

// В app.ts
app.use(securityMiddleware);
app.use(generalRateLimiter);
app.use('/api/auth', authRateLimiter);

// Защищенные роуты
app.get('/api/profile', authenticate, (req, res) => {});
app.post('/api/admin/users', authenticate, requireAdmin, (req, res) => {});
app.get('/api/moderation', authenticate, requireRole('ADMIN', 'MODERATOR'), (req, res) => {});

// Error handling
app.use(errorHandler);
```

---

## 🔄 Middleware Sets (из index.ts)

```typescript
// Готовые наборы middleware
import {
  securityMiddlewareSet,    // Безопасность
  loggingMiddlewareSet,       // Логирование
  rateLimitMiddlewareSet,     // Rate limiting
  authMiddlewareSet,          // Аутентификация
  paymentMiddlewareSet,       // Платежи
  caseOpeningMiddlewareSet,    // Открытие кейсов
  adminMiddlewareSet,          // Admin панель
  protectedMiddlewareSet       // Защищенные роуты (authenticate + rate limit)
} from './index.js';

// Пример использования с auth middleware
app.use('/api/profile', authMiddlewareSet); // включает логирование и rate limiting
app.post('/api/admin', adminMiddlewareSet); // включает auth, logging и rate limiting
app.all('/api/protected/*', protectedMiddlewareSet); // универсальный набор для защищенных роутов
```
