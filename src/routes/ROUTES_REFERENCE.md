# 🚀 Роуты - Справочник

## 📖 Обзор

API роуты приложения с версией /api/v1/\* для CS:GO Case Opening Platform.

---

## 🌐 Эндпоинты

### **Базовый URL**

```
http://localhost:5000/api/v1/
```

### **🔐 Authentication**

```
GET  /api/v1/auth/steam          → OAuth через Steam
GET  /api/v1/auth/steam/return   → Steam OAuth callback
GET  /api/v1/auth/vk             → OAuth через VK
GET  /api/v1/auth/vk/callback    → VK OAuth callback
GET  /api/v1/auth/me             → Профиль пользователя (JWT)
```

### **🗃️ Cases**

```
GET  /api/v1/cases                 → Список всех активных кейсов (с фильтрацией)
GET  /api/v1/cases/filters         → Получить минимальную и максимальную цену кейсов
GET  /api/v1/cases/:slug           → Детали кейса с предметами (по slug)
```

**Query параметры для фильтрации кейсов (GET /api/v1/cases):**

- `search?: string` - поиск по названию кейса (регистронезависимый)
- `from?: number` - минимальная цена кейса (в копейках)
- `to?: number` - максимальная цена кейса (в копейках)

**Примеры запросов:**

```bash
# Получить все кейсы
GET /api/v1/cases

# Поиск по названию
GET /api/v1/cases?search=dragon

# Фильтрация по цене (от 100₽ до 500₽)
GET /api/v1/cases?from=100&to=500

# Фильтрация только минимальной цены (от 200₽)
GET /api/v1/cases?from=200

# Комбинированная фильтрация
GET /api/v1/cases?search=dragon&from=10000&to=100000
```

**Ответ для GET /api/v1/cases/filters:**

```json
{
  "success": true,
  "data": {
    "minPrice": 10000,
    "maxPrice": 500000
  }
}
```

### **📁 Categories**

```
GET  /api/v1/categories                 → Список активных категорий
GET  /api/v1/categories/:slug            → Категория с активными кейсами
```

### **👤 User Profile**

```
GET   /api/v1/user/:id               → Профиль пользователя по ID (публичный)
GET   /api/v1/user/profile           → Текущий профиль пользователя (JWT)
GET   /api/v1/user/inventory         → Инвентарь пользователя с пагинацией (JWT)
GET   /api/v1/user/history           → История открытий кейсов (JWT)
PATCH /api/v1/user/trade-url         → Обновить trade URL (JWT + validation)
POST  /api/v1/users/items/:id/sell   → Продать скин за 80% от цены (JWT)
```

**Примечания:**

- `GET /user/:id` - публичный endpoint, но с опциональной авторизацией
- Если авторизован И запрашивает свой профиль → возвращает расширенные данные (balance, tradeUrl, isBlocked, favoriteCaseId, bestDropItemId)
- Если не авторизован ИЛИ чужой профиль → возвращает только публичные данные (username, avatarUrl, openingsCount)
- `GET /user/profile` - требует JWT, возвращает полные данные текущего пользователя

**Продажа скина (POST /api/v1/users/items/:id/sell):**

Позволяет пользователю продать скин обратно сайту за 80% от рыночной цены.

**Требования:**
- JWT авторизация
- Предмет должен принадлежать пользователю
- Статус предмета должен быть `OWNED` (нельзя продать уже проданный или выведенный)

**Request:**
```bash
POST /api/v1/users/items/cmh412pc90000iiy0ovjcym6g/sell
Authorization: Bearer <JWT_TOKEN>
```

**Response при успехе:**
```json
{
  "success": true,
  "message": "Скин успешно продан",
  "data": {
    "soldPrice": 80000,
    "newBalance": 150000,
    "itemName": "AK-47 | Redline (Field-Tested)",
    "originalPrice": 100000
  }
}
```

**Поля ответа:**
- `soldPrice` - сумма, полученная пользователем (80% от цены, в копейках)
- `newBalance` - новый баланс пользователя после продажи (в копейках)
- `itemName` - название проданного предмета
- `originalPrice` - оригинальная рыночная цена скина (100%, в копейках)

**Response при ошибках:**
```json
// Предмет не найден или не принадлежит пользователю
{
  "success": false,
  "message": "Предмет не найден в вашем инвентаре"
}

// Попытка продать предмет с неподходящим статусом
{
  "success": false,
  "message": "Невозможно продать предмет со статусом \"SOLD\". Продать можно только предметы со статусом \"OWNED\""
}
```

**Бизнес-логика:**
- Комиссия сайта: 20%
- Пример: скин стоит 1000₽ (100000 копеек) → пользователь получает 800₽ (80000 копеек)
- Операция атомарная (транзакция): статус меняется на `SOLD` + баланс увеличивается
- Все операции логируются для аудита

### **💳 Payments**

```
POST /api/v1/payments/create           → Создание платежа (JWT + rate limit)
POST /api/v1/payments/webhook          → YooKassa webhook (публичный)
GET  /api/v1/payments/transactions     → История транзакций (JWT)
```

### **🔐 Admin - Cases**

```
POST   /api/v1/admin/cases                → Создать кейс (Admin + JWT + rate limit)
GET    /api/v1/admin/cases                → Получить все кейсы (Admin + JWT)
GET    /api/v1/admin/cases/:id            → Получить кейс по ID (Admin + JWT)
PUT    /api/v1/admin/cases/:id            → Обновить кейс (Admin + JWT + rate limit)
DELETE /api/v1/admin/cases/:id            → Удалить кейс (Admin + JWT + rate limit)
POST   /api/v1/admin/cases/:id/items      → Добавить предметы в кейс (Admin + JWT + rate limit)
```

**Структура тела для добавления предметов:**

```json
{
  "items": [
    {
      "marketHashName": "AK-47 | Затерянная земля (Factory New)",
      "chancePercent": 8.5
    }
  ]
}
```

**Поля:**

- `marketHashName` (string, обязательно) - точное название скина из CS2 API
- `chancePercent` (number, обязательно) - вероятность выпадения (0.01 - 100)

**Валидация:**

- Сумма всех `chancePercent` ≤ 100.01% (допуск для float погрешности)
- Скин проверяется в кэше skins-cache.json
- Дубликаты блокируются (один скин не может быть в кейсе дважды)
- Цена автоматически получается из market.csgo.com API

### **📁 Admin - Categories**

```
GET    /api/v1/admin/categories              → Получить все категории (Admin + JWT)
GET    /api/v1/admin/categories/:id          → Получить категорию с кейсами (Admin + JWT)
POST   /api/v1/admin/categories              → Создать категорию (Admin + JWT + rate limit)
PUT    /api/v1/admin/categories/:id          → Обновить категорию (Admin + JWT + rate limit)
DELETE /api/v1/admin/categories/:id          → Удалить категорию (Admin + JWT + rate limit)
POST   /api/v1/admin/categories/:id/assign-cases → Назначить кейсы (Admin + JWT + rate limit)
```

### **👥 Admin - Users**

```
GET   /api/v1/admin/users                    → Список пользователей с фильтрами (Admin + JWT)
PATCH /api/v1/admin/users/:id/toggle-block   → Блокировка/разблокировка (Admin + JWT + rate limit)
PATCH /api/v1/admin/users/:id/balance        → Обновить баланс (Admin + JWT + rate limit)
```

### **📊 Admin - Stats**

```
GET  /api/v1/admin/stats/dashboard            → Статистика дашборда (Admin + JWT)
GET  /api/v1/admin/stats/popular-cases        → Популярные кейсы (Admin + JWT)
GET  /api/v1/admin/stats/recent-transactions  → Недавние транзакции (Admin + JWT)
```

### **🔍 Admin - Skins**

```
GET    /api/v1/admin/skins              → Фильтрация и пагинация скинов (Admin + JWT)
GET    /api/v1/admin/skins/stats        → Статистика по скинам в кэше (Admin + JWT)
GET    /api/v1/admin/skins/filters      → Доступные фильтры (Admin + JWT)
GET    /api/v1/admin/skins/:id          → Детали скина по ID (Admin + JWT)
POST   /api/v1/admin/skins/sync         → Ручная синхронизация скинов (Admin + JWT + rate limit)
```

**Query параметры для фильтрации скинов (GET /api/v1/admin/skins):**

- `search?: string` - поиск по name или market_hash_name
- `weaponId?: string` - фильтр по оружию (weapon.id)
- `categoryId?: string` - фильтр по категории (category.id)
- `rarityId?: string` - фильтр по редкости (rarity.id)
- `patternId?: string` - фильтр по паттерну (pattern.id)
- `wearId?: string` - фильтр по износу (wear.id)
- `stattrak?: boolean` - фильтр по наличию StatTrak™
- `souvenir?: boolean` - фильтр по сувенирным версиям
- `page?: number` - номер страницы (default: 1)
- `limit?: number` - лимит на странице (default: 50, max: 500)
- `sortBy?: 'name' | 'rarity' | 'weapon' | 'category'` - поле сортировки (default: 'name')
- `sortOrder?: 'asc' | 'desc'` - направление сортировки (default: 'asc')

**Rate limiting:**

- POST `/sync` - ограничен 5 запросами в 15 минут (тяжёлая операция)
- Остальные эндпоинты используют стандартный adminRateLimiter (50 req/min)

**Особенности:**

- Все запросы используют кэш в памяти (skinsCache) для максимальной производительности
- Мгновенная фильтрация ~1-5 мс
- Поддерживаются сложные фильтры по всем полям скина
- Автоматическая пагинация и сортировка

### **📝 Health Check**

```
GET  /health                     → Статус сервера
```

### **🎯 Case Openings**

```
POST  /api/v1/openings/open        → Открытие кейса (JWT + rate limit)
GET   /api/v1/openings/recent     → Live-лента последних открытий
```

---

## 🏗️ Структура

### **Централизованный роутер** (`routes/index.ts`)

```typescript
import { Router } from 'express';
import authRoutes from './auth.routes.js';

const router = Router();

// V1 API Middleware
router.use('/v1', (req, _res, next) => {
  req.apiVersion = '1.0';
  next();
});

// V1 Routes
router.use('/v1/auth', authRoutes);
router.use('/v1/cases', caseRoutes);
router.use('/v1/openings', caseOpeningRoutes);
router.use('/v1/users', userRoutes);
```

### **App.ts интеграция**

```typescript
import routes from './routes/index.js';

app.use('/api', routes);
```

---

## 📋 Поток запросов

1. Client → `GET /api/v1/auth/steam`
2. Express → Routes Router
3. V1 Middleware → `req.apiVersion = '1.0'`
4. Auth Routes → `auth.controller.ts`
5. Response → Back to client

---

## 🔧 TypeScript

### **Расширение Request**

```typescript
declare global {
  namespace Express {
    interface Request {
      apiVersion?: string;
    }
  }
}
```

---

## 📝 Примеры использования

### **OAuth Flow**

```typescript
// Start Steam OAuth
window.location.href = '/api/v1/auth/steam';

// Handle callback後
// Frontend получает token
localStorage.setItem('token', receivedToken);
```

### **API Calls**

```typescript
const profile = await fetch('/api/v1/auth/me', {
  headers: { Authorization: `Bearer ${token}` },
});
```

---

## 📋 Поток запросов (открытие кейса)

1. **Client Request:** `POST /api/v1/openings/open`
2. **Express → Routes Router:** `/v1/openings`
3. **V1 Middleware:** `req.apiVersion = '1.0'`
4. **Auth Middleware:** JWT проверка → `req.user`
5. **Rate Limiter:** Защита от спама
6. **Controller:** `caseOpeningController.openCase`
7. **Service:** `caseOpeningService.openCase`
8. **Prisma Transaction:** Atomic операции
9. **Database:** Примеряем изменения → Commit
10. **Response:** `ICaseOpeningResult` с выпавшим предметом

## 🚀 Future Routes

```typescript
// Планируемые роуты
router.use('/v1/admin', adminRoutes);
```

---

### **🎯 Case Openings - Подробно**

```
POST  /api/v1/openings/open              → Открыть кейс (JWT + rate limit)
GET   /api/v1/openings/recent            → Live-лента последних 50 открытий (публичный)
```

**Request для открытия кейса:**

```json
{
  "caseId": "cmh412pc90000iiy0ovjcym6g"
}
```

**Response при успехе:**

```json
{
  "success": true,
  "data": {
    "success": true,
    "item": {
      "id": "item-id",
      "displayName": "AK-47 | Затерянная земля (Factory New)",
      "imageUrl": "https://...",
      "price": 129900,
      "sellPrice": 103920,
      "rarity": "CLASSIFIED",
      "weaponName": "AK-47",
      "skinName": "Затерянная земля",
      "quality": "Factory New"
    },
    "newBalance": 50000
  }
}
```

**Важные поля в ответе:**
- `item.price` - рыночная цена скина (100%, в копейках)
- `item.sellPrice` - цена продажи с учетом комиссии (80% от рыночной цены, в копейках)
- `newBalance` - новый баланс пользователя после открытия кейса

**Пример:**
- Скин стоит 1299₽ (129900 копеек) - это `price`
- При продаже пользователь получит 1039₽ (103920 копеек) - это `sellPrice`
- Комиссия сайта: 20%

---

## 🔧 Типы данных и редкость

### **ItemRarity enum**

```typescript
export const ItemRarities = {
  CONSUMER: 'CONSUMER', // Ширпотреб
  INDUSTRIAL: 'INDUSTRIAL', // Промышленное качество
  MIL_SPEC: 'MIL_SPEC', // Армейское качество
  RESTRICTED: 'RESTRICTED', // Запрещённое
  CLASSIFIED: 'CLASSIFIED', // Засекреченное
  COVERT: 'COVERT', // Сверхредкое (древние, контрабанда)
  KNIFE: 'KNIFE', // Нож (зарезервировано для будущего)
} as const;
```

### **Маппирование CS2 API редкостей на ItemRarity**

| CS2 API `rarity.id`        | ItemRarity   | Описание                    |
| -------------------------- | ------------ | --------------------------- |
| `rarity_common_weapon`     | `CONSUMER`   | Ширпотреб                   |
| `rarity_uncommon_weapon`   | `INDUSTRIAL` | Промышленное качество       |
| `rarity_rare_weapon`       | `MIL_SPEC`   | Армейское качество          |
| `rarity_mythical_weapon`   | `RESTRICTED` | Запрещённое                 |
| `rarity_legendary_weapon`  | `CLASSIFIED` | Засекреченное               |
| `rarity_ancient`           | `COVERT`     | Экстраординарное (перчатки) |
| `rarity_ancient_weapon`    | `COVERT`     | Тайное (оружие)             |
| `rarity_contraband_weapon` | `COVERT`     | Контрабанда                 |

---

## 🔄 Поток создания предмета при добавлении в кейс

1. **Валидация входных данных**
   - `marketHashName` (обязательно)
   - `chancePercent` (0.01 - 100)
   - Сумма всех chancePercent ≤ 100.01%

2. **Проверка в БД**
   - Существует ли скин с таким marketHashName?

3. **Если нет в БД:**
   - Поиск в `skins-cache.json` по `market_hash_name`
   - Если не найден → ошибка "Скин не найден ни в базе, ни в кэше скинов"

4. **Получение цены**
   - Запрос к market.csgo.com API
   - `/api/v2/search-item-by-hash-name`
   - Выбор минимальной цены (могут быть разные класс/инстанс варианты)

5. **Создание Item в БД**
   - `marketHashName` из cache
   - `displayName` из cache (русское/локализованное имя)
   - `imageUrl` из cache
   - `price` из API (в копейках)
   - `rarity` маппируется через `mapRarityIdToEnum(cache.rarity.id)`

6. **Добавление в Case**
   - Создание CaseItem с `chancePercent`

---

## 🔐 Синхронизация данных

### **Cron Jobs**

1. **Синхронизация скинов (03:00 UTC)**
   - Получает актуальный список скинов из GitHub API (ByMykel/CSGO-API)
   - Обновляет `server/data/skins-cache.json`
   - Перезагружает индексы в памяти (`skinsCache.reload()`)

2. **Обновление цен (04:00 UTC)**
   - Получает все Item из БД
   - Батчит запросы к market.csgo.com (по 10 скинов за раз)
   - Обновляет цены в БД
   - Логирует статистику (успешно обновлено/не удалось, мин/макс/среднее цены)

---

## 📝 Кэширование скинов в памяти

**Утилита:** `server/src/utils/skinsCache.util.ts`

Загружается один раз при старте сервера, индексируется для быстрого поиска:

```typescript
// Индексы
indexByHashName: Map<string, CachedSkin>  // О(1) поиск по названию
indexByRarity: Map<string, CachedSkin[]>  // О(1) поиск по редкости
indexByWeapon: Map<string, CachedSkin[]>  // О(1) поиск по оружию
indexById: Map<string, CachedSkin>        // О(1) поиск по ID

// Методы
findByHashName(hashName: string): CachedSkin | undefined
findByRarity(rarityId: string): CachedSkin[]
findByWeapon(weaponId: string): CachedSkin[]
search(filters: { query?, rarity?, weapon?, limit? }): CachedSkin[]
```

---

_Последнее обновление: 12.11.2025_
