import type { Request, Response, NextFunction } from 'express';
import { config } from '../config/env.config.js';
import { logger } from './logger.middleware.js';

/**
 * Базовый класс для пользовательских ошибок приложения
 */
export class AppError extends Error {
  public readonly statusCode: number;
  public readonly isOperational: boolean;
  public readonly code?: string;
  public readonly details?: any;

  constructor(
    message: string,
    statusCode: number = 500,
    isOperational: boolean = true,
    code?: string,
    details?: any
  ) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    this.code = code;
    this.details = details;

    // Убеждаемся, что имя ошибки правильное
    this.name = this.constructor.name;

    // Захватываем stack trace
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Ошибка валидации (400)
 */
export class ValidationError extends AppError {
  constructor(message: string = 'Ошибка валидации данных', details?: any) {
    super(message, 400, true, 'VALIDATION_ERROR', details);
  }
}

/**
 * Ошибка аутентификации (401)
 */
export class UnauthorizedError extends AppError {
  constructor(message: string = 'Требуется аутентификация', details?: any) {
    super(message, 401, true, 'UNAUTHORIZED', details);
  }
}

/**
 * Ошибка авторизации (403)
 */
export class ForbiddenError extends AppError {
  constructor(message: string = 'Доступ запрещен', details?: any) {
    super(message, 403, true, 'FORBIDDEN', details);
  }
}

/**
 * Ошибка "Не найдено" (404)
 */
export class NotFoundError extends AppError {
  constructor(resource: string = 'Ресурс') {
    super(`${resource} не найден`, 404, true, 'NOT_FOUND');
  }
}

/**
 * Ошибка конфликта (409)
 */
export class ConflictError extends AppError {
  constructor(message: string = 'Конфликт данных', details?: any) {
    super(message, 409, true, 'CONFLICT', details);
  }
}

/**
 * Ошибка_TOO_MANY_REQUESTS (429)
 */
export class TooManyRequestsError extends AppError {
  constructor(message: string = 'Слишком много запросов', retryAfter?: number) {
    super(message, 429, true, 'TOO_MANY_REQUESTS', { retryAfter });
  }
}

/**
 * Ошибка сервера (500)
 */
export class InternalServerError extends AppError {
  constructor(message: string = 'Внутренняя ошибка сервера', details?: any) {
    super(message, 500, true, 'INTERNAL_SERVER_ERROR', details);
  }
}

/**
 * Ошибка базы данных
 */
export class DatabaseError extends AppError {
  constructor(message: string = 'Ошибка базы данных', details?: any) {
    super(message, 500, true, 'DATABASE_ERROR', details);
  }
}

/**
 * Ошибка внешнего сервиса
 */
export class ExternalServiceError extends AppError {
  constructor(service: string, message: string = 'Ошибка внешнего сервиса') {
    super(`${service}: ${message}`, 502, true, 'EXTERNAL_SERVICE_ERROR', { service });
  }
}

/**
 * Ошибка конфигурации
 */
export class ConfigurationError extends AppError {
  constructor(message: string = 'Ошибка конфигурации') {
    super(message, 500, false, 'CONFIGURATION_ERROR');
  }
}

/**
 * Middleware для обработки 404 ошибок (не найден роут)
 * 
 * @param {Request} req - Express request
 * @param {Response} res - Express response
 * @param {NextFunction} next - Express next function
 */
export const notFoundHandler = (req: Request, _res: Response, next: NextFunction) => {
  const error = new NotFoundError(`Маршрут ${req.method} ${req.path}`);
  next(error);
};

/**
 * Middleware для обработки ошибок Express
 * 
 * @param {Error} err - Error object
 * @param {Request} req - Express request
 * @param {Response} res - Express response
 * @param {NextFunction} next - Express next function
 */
export const errorHandler = (
  err: Error,
  req: Request,
  res: Response,
  _next: NextFunction
): void => {
  let error = handleKnownErrors(err);

  // Устанавливаем traceId в ответ
  const traceId = req.traceId || 'unknown';

  // Формируем ответ в зависимости от окружения
  let errorResponse: any;

  if (config.isDevelopment) {
    // В development режиме возвращаем полную информацию об ошибке
    errorResponse = {
      success: false,
      error: {
        message: error.message,
        code: error.code,
        statusCode: error.statusCode,
        traceId,
        timestamp: new Date().toISOString(),
        stack: error.stack,
        details: error.details
      }
    };
  } else if (config.isProduction) {
    // В production режиме возвращаем только необходимую информацию
    errorResponse = {
      success: false,
      error: {
        message: error.isOperational ? error.message : 'Внутренняя ошибка сервера',
        code: error.isOperational ? error.code : 'INTERNAL_SERVER_ERROR',
        statusCode: error.statusCode,
        traceId,
        timestamp: new Date().toISOString()
      }
    };

    // Для rate limiting включаем retryAfter
    if (error instanceof TooManyRequestsError && error.details?.retryAfter) {
      errorResponse.error.retryAfter = error.details.retryAfter;
      res.set('Retry-After', error.details.retryAfter.toString());
    }
  } else {
    // Для тест режима
    errorResponse = {
      success: false,
      error: {
        message: error.message,
        code: error.code,
        statusCode: error.statusCode,
        traceId,
        timestamp: new Date().toISOString(),
        details: error.details
      }
    };
  }

  // Логируем ошибку
  logError(error, req);

  // Отправляем ответ клиенту
  res.status(error.statusCode).json(errorResponse);
};

/**
 * Обработка известных типов ошибок
 * 
 * @param {Error} err - Error object
 * @returns {AppError} Обработанная ошибка
 */
const handleKnownErrors = (err: Error): AppError => {
  // Если ошибка уже является AppError, возвращаем как есть
  if (err instanceof AppError) {
    return err;
  }

  // Ошибки валидации (например, от express-validator)
  if (err.name === 'ValidationError') {
    return new ValidationError(err.message, err);
  }

  // Ошибки JSON синтаксиса
  if (err instanceof SyntaxError && 'body' in err) {
    return new ValidationError('Некорректный JSON в теле запроса');
  }

  // Ошибки Prisma
  if (err.name === 'PrismaClientKnownRequestError') {
    const prismaError = err as any;
    
    switch (prismaError.code) {
      case 'P2002':
        return new ConflictError('Запись с такими данными уже существует', {
          field: prismaError.meta?.target
        });
      case 'P2025':
        return new NotFoundError('Запись не найдена');
      default:
        return new DatabaseError('Ошибка базы данных', {
          code: prismaError.code,
          meta: prismaError.meta
        });
    }
  }

  // Ошибки JWT
  if (err.name === 'JsonWebTokenError') {
    return new UnauthorizedError('Неверный токен авторизации');
  }

  if (err.name === 'TokenExpiredError') {
    return new UnauthorizedError('Токен авторизации истек');
  }

  // Ошибки mongoose (если используется)
  if (err.name === 'CastError') {
    return new ValidationError('Неверный формат данных');
  }

  if (err.name === 'MongoError' || err.name === 'MongoServerError') {
    const mongoError = err as any;
    
    if (mongoError.code === 11000) {
      return new ConflictError('Запись с такими данными уже существует');
    }
    
    return new DatabaseError('Ошибка базы данных');
  }

  // Network ошибки
  if (err.name === 'FetchError') {
    return new ExternalServiceError('Network', 'Ошибка сети при запросе к внешнему сервису');
  }

  // Timeout ошибки
  if (err.name === 'TimeoutError' || err.message.includes('timeout')) {
    return new ExternalServiceError('Network', 'Таймаут при запросе к внешнему сервису');
  }

  // По умолчанию - внутренняя ошибка сервера
  return new InternalServerError('Внутренняя ошибка сервера', {
    originalError: err.name,
    originalMessage: err.message
  });
};

/**
 * Логирование ошибок
 * 
 * @param {AppError} error - Error object
 * @param {Request} req - Express request
 */
const logError = (error: AppError, req: Request): void => {
  const logData = {
    error: {
      name: error.name,
      message: error.message,
      code: error.code,
      statusCode: error.statusCode,
      isOperational: error.isOperational,
      stack: error.stack,
      details: error.details
    },
    request: {
      method: req.method,
      url: req.url,
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      traceId: req.traceId
    },
    user: (req.user as any)?.id,
    timestamp: new Date().toISOString()
  };

  if (error.isOperational) {
    // Операционные ошибки логируем как warn
    logger.warn('Operational error', logData);
  } else {
    // Неоперационные ошибки логируем как error
    logger.error('Unexpected error', logData);
  }
};

/**
 * Middleware для асинхронных функций с автоматической обработкой ошибок
 * 
 * @param {Function} fn - Async функция
 * @returns {Function} Express middleware
 */
export const asyncHandler = (fn: Function) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

/**
 * Middleware для валидации результата и автоматического возврата ошибок
 * 
 * @param {any} result - Результат операции
 * @param {string} errorMessage - Сообщение об ошибке по умолчанию
 * @throws {AppError} В случае если result равен null, undefined или false
 */
export const validateResult = (result: any, errorMessage: string = 'Операция не удалась') => {
  if (result === null || result === undefined || result === false) {
    throw new ValidationError(errorMessage);
  }
  return result;
};

/**
 * Создание ошибки с дополнительным контекстом
 * 
 * @param {string} message - Сообщение об ошибке
 * @param {number} statusCode - HTTP статус код
 * @param {object} context - Контекст ошибки
 * @returns {AppError} Объект ошибки
 */
export const createError = (
  message: string,
  statusCode: number = 500,
  context: object = {}
): AppError => {
  return new AppError(message, statusCode, true, undefined, context);
};
