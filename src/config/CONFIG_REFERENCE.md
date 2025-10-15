# Config Reference

## 📋 Описание
Справочник конфигурации проекта с описанием файлов в папке `src/config/`.

---

## 🔧 Environment Configuration (`env.config.ts`)

### Environment Variables Schema
- **Базовые**: `NODE_ENV`, `PORT`
- **База данных**: `DATABASE_URL`
- **JWT**: `JWT_SECRET`, `JWT_EXPIRES_IN`
- **Steam OAuth**: `STEAM_API_KEY`, `STEAM_RETURN_URL`
- **VK OAuth**: `VK_APP_ID`, `VK_APP_SECRET`, `VK_CALLBACK_URL`
- **Платежи**: `YOOKASSA_SHOP_ID`, `YOOKASSA_SECRET_KEY`
- **Внешние сервисы**: `MARKET_CSGO_API_KEY`
- **Безопасность**: `CORS_ORIGIN`, `RATE_LIMIT_*`

### Validation
- **Zod schema** - строгая валидация всех env переменных
- **Error messages** - четкие сообщения об ошибках
- **Defaults** - значения по умолчанию для опциональных полей

### Config Object
```typescript
export const config = {
  // Server config
  nodeEnv: 'development' | 'production' | 'test',
  port: number,
  
  // Database
  database: { url: string },
  
  // JWT
  jwt: { secret: string, expiresIn: string },
  
  // OAuth
  steam: { apiKey: string, returnUrl: string },
  vk: { appId: string, appSecret: string, callbackUrl: string },
  
  // External services
  marketCsgo: { apiKey: string },
  yookassa: { shopId: string, secretKey: string },
  
  // Security
  cors: { origin: string },
  rateLimit: { windowMs: number, maxRequests: number },
  
  // Logging
  logging: { level: 'error' | 'warn' | 'info' | 'debug' }
}
```

---

## 🗄️ Database Configuration (`database.ts`)

### Prisma Client
```typescript
const prisma = new PrismaClient({
  log: config.isDevelopment ? ['query', 'info', 'warn', 'error'] : ['warn', 'error']
});
```

### Functions
- **`connectDatabase()`** - подключение к БД
- **`disconnectDatabase()`** - отключение от БД
- **Graceful shutdown** - автоматическое отключение при остановке

### Logging
- Development: полный лог всех запросов
- Production: только warn и error логи

---

## 🔐 Passport Configuration (`passport.config.ts`)

### Steam Strategy
- **Config**: API key, return URL, realm
- **Verify logic**: поиск/создание пользователя по steamId
- **Data**: steamId, username, avatarUrl
- **Default role**: 'USER'

### VK Strategy  
- **Config**: client ID, client secret, callback URL
- **Verify logic**: поиск/создание пользователя по vkId
- **Data**: vkId, username, avatarUrl (photo[0])
- **Default role**: 'USER'

### Serialization
- **`serializeUser`** - сохраняет user.id
- **`deserializeUser`** - восстанавливает пользователя по id

---

## 📦 Импорт и Использование

```typescript
// Environment config
import { config } from './env.config.js';

// Database
import { connectDatabase, disconnectDatabase, prisma } from './database.js';

// Passport
import passport from './passport.config.js';

// В коде
await connectDatabase();
const users = await prisma.user.findMany();
app.use(passport.initialize());
```

---

## 🔑 Ключевые особенности

### Безопасность
- Строгая валидация всех env переменных
- Zubmit конфигурации при неверных значениях
- Доступ к конфигурированию только через typed объект

### Разработка
- Значения по умолчанию для development
- Детальные ошибки валидации
- Разные уровни логирования для окружений

### Производительность
- Prisma logging optimization
- Connection pooling
- Graceful database shutdown

---

## 🚀 Environment Setup

### .env.example
Копия шаблона для локальной разработки с комментариями по каждой переменной.

### Required Variables
```bash
NODE_ENV=development
PORT=5000
DATABASE_URL=postgresql://...
JWT_SECRET=32-character-secret
STEAM_API_KEY=your-steam-api-key
VK_APP_ID=your-vk-app-id
VK_APP_SECRET=your-vk-secret
```

### Optional Variables
```bash
STEAM_RETURN_URL=http://localhost:5000/auth/steam/return
VK_CALLBACK_URL=http://localhost:5000/auth/vk/callback
YOOKASSA_SHOP_ID=your-shop-id
CORS_ORIGIN=http://localhost:3000
```
