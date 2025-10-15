# 🚀 Роуты - Справочник

## 📖 Обзор
API роуты приложения с версией /api/v1/* для CS:GO Case Opening Platform.

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
GET  /api/v1/cases                 → Список всех активных кейсов
GET  /api/v1/cases/:slug          → Детали кейса с предметами (по slug)
```

### **👤 Users**
```
GET  /api/v1/users/inventory      → Инвентарь пользователя (JWT)
GET  /api/v1/users/history        → История открытий кейсов (JWT)
```

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
  headers: { Authorization: `Bearer ${token}` }
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

*Последнее обновление: 17.10.2025*
