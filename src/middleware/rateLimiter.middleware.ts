import rateLimit from 'express-rate-limit';
import type { Request, Response } from 'express';
import { config } from '../config/env.config.js';

// Расширяем интерфейс Request для rateLimit свойств
declare global {
  namespace Express {
    interface Request {
      rateLimit?: {
        limit?: number;
        current?: number;
        remaining?: number;
        resetTime?: Date;
      };
    }
  }
}

/**
 * Базовые настройки для всех rate limiters
 */
const baseOptions = {
  // Использовать прокси-заголовки для определения IP
  trustProxy: true,
  
  // Стандартный ответ при превышении лимита
  handler: (req: Request, res: Response) => {
    res.status(429).json({
      error: 'Too Many Requests',
      message: 'Слишком много запросов. Попробуйте повторить позже.',
      retryAfter: Math.round(req.rateLimit?.resetTime ? (req.rateLimit.resetTime.getTime() - Date.now()) / 1000 : 60),
      limit: req.rateLimit?.limit,
      current: req.rateLimit?.current,
      timestamp: new Date().toISOString()
    });
  },
  
  // Пропускать успешные запросы (не считать их)
  skipSuccessfulRequests: false,
  
  // Пропускать неудачные запросы
  skipFailedRequests: false,
  
  // Ключ для rate limiting (по умолчанию IP)
  keyGenerator: (req: Request) => {
    // Для аутентифицированных пользователей используем ID пользователя
    if (req.user && typeof req.user === 'object' && 'id' in req.user) {
      return `user:${(req.user as any).id}`;
    }
    
    // Для неаутентифицированных используем IP
    return `ip:${req.ip}`;
  }
};

/**
 * Общий rate limiter для всех API запросов
 * - 100 запросов в минуту
 * - Применяется ко всем API эндпоинтам
 */
export const generalRateLimiter = rateLimit({
  ...baseOptions,
  windowMs: config.rateLimit.windowMs, // 60 секунд по умолчанию
  max: config.rateLimit.maxRequests, // 100 запросов по умолчанию
  message: {
    error: 'Too Many Requests',
    message: 'Превышен общий лимит запросов. Не более 100 запросов в минуту.',
    timestamp: new Date().toISOString()
  },
  headers: true // Добавлять X-RateLimit-* заголовки
});

/**
 * Строгий rate limiter для эндпоинтов аутентификации
 * - 5 запросов в минуту
 * - Защищает от брутфорса паролей
 * - Применяется к /api/auth/*
 */
export const authRateLimiter = rateLimit({
  ...baseOptions,
  windowMs: 60 * 1000, // 1 минута
  max: 5, // 5 попыток в минуту
  message: {
    error: 'Too Many Authentication Attempts',
    message: 'Слишком много попыток входа. Попробуйте через 1 минуту.',
    timestamp: new Date().toISOString()
  },
  // Для auth endpoints используем только IP (более строго)
  keyGenerator: (req: Request) => `ip:${req.ip}`,
  // Пропускаем успешные запросы (чтобы успешный вход не учитывался)
  skipSuccessfulRequests: true
});

/**
 * Rate limiter для открытия кейсов
 * - 10 запросов в минуту
 * - Защищает от спама открытием кейсов
 * - Применяется к /api/cases/open/*
 */
export const caseOpeningRateLimiter = rateLimit({
  ...baseOptions,
  windowMs: 60 * 1000, // 1 минута
  max: 10, // 10 открытий в минуту
  message: {
    error: 'Too Many Case Openings',
    message: 'Слишком много открытий кейсов. Не более 10 в минуту.',
    timestamp: new Date().toISOString()
  },
  // Учитываем только успешные запросы
  skipSuccessfulRequests: false,
  // Добавляем задержку между запросами
  standardHeaders: true,
  legacyHeaders: false
});

/**
 * Строгий rate limiter для-payment эндпоинтов
 * - 5 запросов в минуту
 * - Защищает от спама платежными операциями
 * - Применяется к /api/payments/*
 */
export const paymentRateLimiter = rateLimit({
  ...baseOptions,
  windowMs: 60 * 1000, // 1 минута
  max: 5, // 5 операций в минуту
  message: {
    error: 'Too Many Payment Attempts',
    message: 'Слишком много попыток оплаты. Попробуйте через 1 минуту.',
    timestamp: new Date().toISOString()
  },
  // Для платежей используем ID пользователя (если есть) или IP
  keyGenerator: (req: Request) => {
    if (req.user && typeof req.user === 'object' && 'id' in req.user) {
      return `payment_user:${(req.user as any).id}`;
    }
    return `payment_ip:${req.ip}`;
  }
});

/**
 * Rate limiter для создания аккаунтов
 * - 3 запроса в час
 * - Защищает от создания множества аккаунтов
 * - Применяется к /api/auth/register
 */
export const registrationRateLimiter = rateLimit({
  ...baseOptions,
  windowMs: 60 * 60 * 1000, // 1 час
  max: 3, // 3 регистрации в час
  message: {
    error: 'Too Many Registration Attempts',
    message: 'Слишком много попыток регистрации. Не более 3 в час.',
    timestamp: new Date().toISOString()
  },
  // Используем IP для предотвращения множественных регистраций
  keyGenerator: (req: Request) => `register_ip:${req.ip}`
});

/**
 * Rate limiter для сброса пароля
 * - 3 запроса в час
 * - Защищает от спама сбросом пароля
 * - Применяется к /api/auth/forgot-password, /api/auth/reset-password
 */
export const passwordResetRateLimiter = rateLimit({
  ...baseOptions,
  windowMs: 60 * 60 * 1000, // 1 час
  max: 3, // 3 запроса в час
  message: {
    error: 'Too Many Password Reset Attempts',
    message: 'Слишком много запросов на сброс пароля. Не более 3 в час.',
    timestamp: new Date().toISOString()
  },
  // Используем IP и email для дополнительной безопасности
  keyGenerator: (req: Request) => {
    const email = req.body?.email || '';
    return `reset_ip:${req.ip}_email:${email}`;
  }
});

/**
 * Rate limiter для OAuth callback'ов
 * - 20 запросов в минуту
 * - Защищает OAuth эндпоинты
 * - Применяется к /auth/*
 */
export const oauthRateLimiter = rateLimit({
  ...baseOptions,
  windowMs: 60 * 1000, // 1 минута
  max: 20, // 20 запросов в минуту
  message: {
    error: 'Too Many OAuth Attempts',
    message: 'Слишком много OAuth запросов. Попробуйте через 1 минуту.',
    timestamp: new Date().toISOString()
  }
});

/**
 * Rate limiter для admin панели
 * - 50 запросов в минуту
 * - Для пользователей с правами администратора
 * - Применяется к /api/admin/*
 */
export const adminRateLimiter = rateLimit({
  ...baseOptions,
  windowMs: 60 * 1000, // 1 минута
  max: 50, // 50 запросов в минуту
  message: {
    error: 'Too Many Admin Requests',
    message: 'Превышен лимит запросов к admin панели.',
    timestamp: new Date().toISOString()
  },
  // Пропускаем запросы только от админов
  skip: (req: Request) => {
    return !(req.user && typeof req.user === 'object' && 'role' in req.user && (req.user as any).role === 'admin');
  }
});

/**
 * Rate limiter для WebSocket соединений
 * - 10 соединений в минуту
 * - Защищает от спама WebSocket подключениями
 */
export const websocketRateLimiter = rateLimit({
  ...baseOptions,
  windowMs: 60 * 1000, // 1 минута
  max: 10, // 10 соединений в минуту
  message: {
    error: 'Too Many WebSocket Connections',
    message: 'Слишком много WebSocket соединений. Попробуйте через 1 минуту.',
    timestamp: new Date().toISOString()
  },
  // Для WebSocket используем только IP
  keyGenerator: (req: Request) => `ws_ip:${req.ip}`
});

/**
 * Middleware для динамического rate limiting в зависимости от пользователя
 * 
 * @param {number} maxRequests - Максимальное количество запросов
 * @param {number} windowMs - Окно времени в миллисекундах
 * @returns {Function} Express middleware
 */
export const createUserRateLimiter = (maxRequests: number, windowMs: number) => {
  return rateLimit({
    ...baseOptions,
    windowMs,
    max: maxRequests,
    message: {
      error: 'Too Many Requests',
      message: `Превышен лимит запросов. Не более ${maxRequests} за ${Math.round(windowMs / 1000 / 60)} минут.`,
      timestamp: new Date().toISOString()
    }
  });
};
