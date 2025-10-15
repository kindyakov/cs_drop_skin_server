# Utils Reference

## 📋 Описание
Справочник утилит проекта с описанием функций в папке `src/utils/`.

---

## ⚠️ Error Utilities (`errors.util.ts`)

### Классы ошибок
- **`AppError`** - Базовый класс для всех ошибок приложения
  - `statusCode: number` - HTTP статус код
  - `isOperational: boolean` - Операционная ошибка
  - `message: string` - Сообщение об ошибке

- **`ValidationError`** - Ошибка валидации данных (400)
- **`UnauthorizedError`** - Ошибка авторизации (401)
- **`ForbiddenError`** - Ошибка доступа (403)
- **`NotFoundError`** - Ошибка отсутствия ресурса (404)
- **`ConflictError`** - Ошибка конфликта данных (409)

---

## 📤 Response Utilities (`response.util.ts`)

### Функции
- **`successResponse(res, data, message?, statusCode)`** - Отправка успешного ответа
  - `res: Response` - Express response
  - `data: any` - Данные для отправки
  - `message?: string` - Опциональное сообщение
  - `statusCode?: number` - HTTP статус (по умолчанию 200)

- **`errorResponse(res, message, statusCode, errors?)`** - Отправка ответа с ошибкой
  - `res: Response` - Express response
  - `message: string` - Сообщение об ошибке
  - `statusCode?: number` - HTTP статус (по умолчанию 500)
  - `errors?: any[]` - Детальные ошибки

---

## 🔐 JWT Utilities (`jwt.util.ts`)

### Типы
- **`JWTPayload`** - Интерфейс payload токена
  ```typescript
  {
    userId: string;
    role: string;
  }
  ```

### Функции
- **`generateToken(payload: JWTPayload)`** - Генерирует JWT токен
  - Параметры: `userId` и `role`
  - Возвращает: JWT строка

- **`verifyToken(token: string)`** - Верифицирует JWT токен
  - Параметры: JWT строка (с Bearer или без)
  - Возвращает: декодированный `JWTPayload`
  - Бросает: `UnauthorizedError` при неверном токене

---

## 🛠️ Helper Utilities (`helpers.util.ts`)

### Функции
- **`slugify(text: string)`** - Преобразует текст в URL-friendly slug
  - Транслитерирует русские буквы
  - Заменяет пробелы на дефисы
  - Возвращает: строка в lower case

- **`formatPrice(kopecks: number)`** - Форматирует цену из копеек в рубли
  - Параметры: количество копеек
  - Возвращает: `"XXX.XX ₽"` формат

- **`sleep(ms: number)`** - Создает задержку выполнения
  - Параметры: миллисекунды
  - Возвращает: Promise<void>

---

## 📦 Импорт утилит

```typescript
// Все утилиты
import * as Utils from './index.js';

// Специфичные утилиты
import { successResponse, errorResponse } from './response.util.js';
import { generateToken, verifyToken } from './jwt.util.js';
import { ValidationError, NotFoundError } from './errors.util.js';
import { slugify, formatPrice, sleep } from './helpers.util.js';
```
