/**
 * Базовый класс для всех ошибок приложения
 */
export class AppError extends Error {
  public readonly statusCode: number;
  public readonly isOperational: boolean;

  constructor(message: string, statusCode: number = 500, isOperational: boolean = true) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    this.name = this.constructor.name;
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Ошибка валидации (400)
 */
export class ValidationError extends AppError {
  constructor(message: string = 'Ошибка валидации данных') {
    super(message, 400);
  }
}

/**
 * Ошибка авторизации (401)
 */
export class UnauthorizedError extends AppError {
  constructor(message: string = 'Требуется аутентификация') {
    super(message, 401);
  }
}

/**
 * Ошибка доступа (403)
 */
export class ForbiddenError extends AppError {
  constructor(message: string = 'Доступ запрещен') {
    super(message, 403);
  }
}

/**
 * Ошибка отсутствия ресурса (404)
 */
export class NotFoundError extends AppError {
  constructor(message: string = 'Ресурс не найден') {
    super(message, 404);
  }
}

/**
 * Ошибка конфликта (409)
 */
export class ConflictError extends AppError {
  constructor(message: string = 'Конфликт данных') {
    super(message, 409);
  }
}
