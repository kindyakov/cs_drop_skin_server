# CS:GO Case Opening Platform - Backend API

Backend сервер для платформы открытия CS:GO кейсов с OAuth авторизацией.

## 🚀 Технологии

- **Node.js 18+** + **TypeScript**
- **Express.js** - веб-фреймворк
- **PostgreSQL** + **Prisma ORM**
- **Passport.js** - OAuth (Steam, VK)
- **JWT** - аутентификация

## 📁 Структура

```
server/
├── src/
│   ├── config/          # Настройки (env, passport)
│   ├── controllers/     # Обработчики запросов
│   ├── middleware/      # Промежуточные слои
│   ├── routes/          # API роуты (/api/v1/*)
│   ├── utils/           # Утилиты (JWT, errors, response)
│   ├── types/           # TypeScript типы
│   ├── app.ts           # Express приложение
│   └── server.ts        # Запуск сервера
├── prisma/
│   └── schema.prisma    # Модель данных
└── .env                 # Переменные окружения
```

## ⚙️ Быстрый старт

### 1. Установка

```bash
npm install
```

### 2. Настройка .env

```bash
cp .env.example .env
```

### 3. База данных

```bash
# PostgreSQL должен быть установлен
# Создать базу данных: cs_cases
```

### 4. Миграции

```bash
npm run prisma:generate
npm run prisma:migrate
```

### 5. Запуск

```bash
npm run dev    # Development
npm start      # Production
```

## 🌐 API Эндпоинты

### **Базовый URL**

```
http://localhost:5000/api/v1/
```

### **Authentication**

```
GET  /api/v1/auth/steam          → OAuth через Steam
GET  /api/v1/auth/steam/return   → Steam callback
GET  /api/v1/auth/vk             → OAuth через VK
GET  /api/v1/auth/vk/callback    → VK callback
GET  /api/v1/auth/me             → Профиль (JWT)
```

### **Health Check**

```
GET  /health                     → Статус сервера
```

## 🔐 OAuth Токен

### **Flow:**

1. Client → `GET /api/v1/auth/steam`
2. Steam → User авторизация
3. Backend → JWT токен
4. Redirect → Frontend с токеном
5. Client → Save token + API calls

### **Использование:**

```javascript
// Получить профиль
fetch('/api/v1/auth/me', {
  headers: { Authorization: `Bearer ${token}` },
});
```

## 📝 Environment Variables

```env
# Server
NODE_ENV=development
PORT=5000

# Database
DATABASE_URL=postgresql://user:password@localhost:5432/cs_cases

# JWT
JWT_SECRET=your-secret-key

# OAuth
STEAM_API_KEY=your-steam-key
VK_CLIENT_ID=your-vk-id
VK_CLIENT_SECRET=your-vk-secret

# Frontend
FRONTEND_URL=http://localhost:3000
```

## 🔑 API Ключи

### **Steam OAuth**

1. [Steam Web API Key](https://steamcommunity.com/dev/apikey)
2. Добавить в `.env`

### **VK OAuth**

1. [VK Application](https://vk.com/apps?act=manage)
2. Настройки: Single-page app + Authorization Code Flow
3. Добавить в `.env`

## 📚 Документация

Полная документация проекта в справочниках:

- **[Utils](src/utils/UTILS_REFERENCE.md)** - Утилиты и хелперы
- **[Types](src/types/TYPES_REFERENCE.md)** - TypeScript типы
- **[Middleware](src/middleware/MIDDLEWARE_REFERENCE.md)** - Промежуточные слои
- **[Config](src/config/CONFIG_REFERENCE.md)** - Конфигурация
- **[Controllers](src/controllers/CONTROLLERS_REFERENCE.md)** - Контроллеры
- **[Routes](src/routes/ROUTES_REFERENCE.md)** - API роуты

## 🚨 Important

- Все роуты используют префикс `/api/v1/*`
- OAuth редирект возвращает JWT токен
- Токен expires через 2 часа
- Backend готов к интеграции с frontend

## 📋 Скрипты

```bash
npm run dev                    # Development с hot-reload
npm run build                  # TypeScript компиляция
npm start                      # Production сервер
npm run start:migrate          # Миграции + запуск (для Railway)
npm run prisma:generate        # Генерация Prisma Client
npm run prisma:migrate         # Применение миграций (dev)
npm run prisma:migrate:deploy  # Применение миграций (prod)
npm run prisma:studio          # Prisma Studio GUI
npm run lint                   # ESLint проверка
npm run format                 # Prettier форматирование
npm run railway:deploy         # Деплой на Railway
```
