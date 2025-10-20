/**
 * Централизованный экспор всех middleware приложения
 * Этот файл позволяет импортировать все middleware из одного места
 */

// ==============================================
// SECURITY MIDDLEWARE
// ==============================================
import {
  securityMiddleware,
  corsMiddleware,
  websocketSecurityMiddleware,
  apiSecurityHeadersMiddleware
} from './security.middleware.js';

// ==============================================
// RATE LIMITER MIDDLEWARE
// ==============================================
import {
  generalRateLimiter,
  authRateLimiter,
  caseOpeningRateLimiter,
  paymentRateLimiter,
  registrationRateLimiter,
  passwordResetRateLimiter,
  oauthRateLimiter,
  adminRateLimiter,
  websocketRateLimiter,
  createUserRateLimiter
} from './rateLimiter.middleware.js';

// ==============================================
// LOGGER MIDDLEWARE
// ==============================================
import {
  logger,
  morganMiddleware,
  requestLoggerMiddleware,
  errorLoggerMiddleware,
  performanceLoggerMiddleware,
  userActionLogger,
  securityLogger,
  businessLogger
} from './logger.middleware.js';

// ==============================================
// ERROR HANDLER MIDDLEWARE
// ==============================================
import {
  errorHandler,
  notFoundHandler,
  asyncHandler,
  validateResult,
  createError,
  // Классы ошибок
  AppError,
  ValidationError,
  UnauthorizedError,
  ForbiddenError,
  NotFoundError,
  ConflictError,
  TooManyRequestsError,
  InternalServerError,
  DatabaseError,
  ExternalServiceError,
  ConfigurationError
} from './errorHandler.middleware.js';

// ==============================================
// AUTH MIDDLEWARE
// ==============================================
import {
  authenticate,
  requireRole,
  requireAdmin,
  checkUserBlocked
} from './auth.middleware.js';

// ==============================================
// VALIDATION MIDDLEWARE
// ==============================================
import {
  validateCaseOpening,
  validatePayment,
  handleValidationErrors,
  validateCreateCase,
  validateUpdateCase,
  validateAddItemsToCase,
  validateCreateCategory,
  validateUpdateCategory,
  validateAssignCases,
  validateUpdateUserBalance,
} from './validation.middleware.js';

// ==============================================
// RE-EXPORT ALL IMPORTS
// ==============================================
export {
  // Security
  securityMiddleware,
  corsMiddleware,
  websocketSecurityMiddleware,
  apiSecurityHeadersMiddleware,
  // Rate Limiters
  generalRateLimiter,
  authRateLimiter,
  caseOpeningRateLimiter,
  paymentRateLimiter,
  registrationRateLimiter,
  passwordResetRateLimiter,
  oauthRateLimiter,
  adminRateLimiter,
  websocketRateLimiter,
  createUserRateLimiter,
  // Logger
  logger,
  morganMiddleware,
  requestLoggerMiddleware,
  errorLoggerMiddleware,
  performanceLoggerMiddleware,
  userActionLogger,
  securityLogger,
  businessLogger,
  // Error Handler
  errorHandler,
  notFoundHandler,
  asyncHandler,
  validateResult,
  createError,
  AppError,
  ValidationError,
  UnauthorizedError,
  ForbiddenError,
  NotFoundError,
  ConflictError,
  TooManyRequestsError,
  InternalServerError,
  DatabaseError,
  ExternalServiceError,
  ConfigurationError,
  // Auth
  authenticate,
  requireRole,
  requireAdmin,
  checkUserBlocked,
  // Validation
  validateCaseOpening,
  validatePayment,
  handleValidationErrors,
  validateCreateCase,
  validateUpdateCase,
  validateAddItemsToCase,
  validateCreateCategory,
  validateUpdateCategory,
  validateAssignCases,
  validateUpdateUserBalance
};

// ==============================================
// EXPORT GROUPS FOR CONVENIENT USAGE
// ==============================================

/**
 * Базовые middleware для всех запросов
 */
export const basicMiddleware = [
  // Здесь будут добавляться базовые middleware типа body parser и т.д.
];

/**
 * Middleware безопасности для всех API запросов
 */
export const securityMiddlewareSet = [
  securityMiddleware,
  corsMiddleware,
  apiSecurityHeadersMiddleware
];

/**
 * Middleware логирования
 */
export const loggingMiddlewareSet = [
  requestLoggerMiddleware,
  performanceLoggerMiddleware,
  morganMiddleware
];

/**
 * Middleware rate limiting
 */
export const rateLimitMiddlewareSet = [
  generalRateLimiter
];

/**
 * Middleware для обработки ошибок (в конце цепочки)
 */
export const errorHandlingMiddlewareSet = [
  notFoundHandler,
  errorHandler
];

// ==============================================
// SPECIALIZED MIDDLEWARE SETS
// ==============================================

/**
 * Middleware для auth эндпоинтов
 */
export const authMiddlewareSet = [
  ...loggingMiddlewareSet,
  authRateLimiter
];

/**
 * Middleware для реестрации пользователей
 */
export const registrationMiddlewareSet = [
  ...loggingMiddlewareSet,
  registrationRateLimiter
];

/**
 * Middleware для сброса пароля
 */
export const passwordResetMiddlewareSet = [
  ...loggingMiddlewareSet,
  passwordResetRateLimiter
];

/**
 * Middleware для открытия кейсов
 */
export const caseOpeningMiddlewareSet = [
  ...loggingMiddlewareSet,
  caseOpeningRateLimiter
];

/**
 * Middleware для платежных операций
 */
export const paymentMiddlewareSet = [
  ...loggingMiddlewareSet,
  paymentRateLimiter
];

/**
 * Middleware для admin панели
 */
export const adminMiddlewareSet = [
  ...loggingMiddlewareSet,
  adminRateLimiter
];

/**
 * Middleware для OAuth эндпоинтов
 */
export const oauthMiddlewareSet = [
  ...securityMiddlewareSet,
  ...loggingMiddlewareSet,
  oauthRateLimiter,
  websocketSecurityMiddleware
];

/**
 * Middleware для WebSocket соединений
 */
export const websocketMiddlewareSet = [
  websocketSecurityMiddleware,
  websocketRateLimiter
];

// ==============================================
// FACTORY FUNCTIONS
// ==============================================

/**
 * Фабрика для создания middleware с определенным уровнем доступа
 * 
 * @param {string} level - Уровень доступа ('user', 'admin', 'guest')
 * @returns {Array} Массив middleware
 */
export const createMiddlewareSet = (level: 'user' | 'admin' | 'guest' = 'user') => {
  const base = [
    ...securityMiddlewareSet,
    ...loggingMiddlewareSet,
    ...rateLimitMiddlewareSet
  ];

  switch (level) {
    case 'admin':
      return [...base, adminRateLimiter];
    case 'user':
      return base;
    case 'guest':
      return base;
    default:
      return base;
  }
};

/**
 * Фабрика для создания middleware для特定 эндпоинтов
 * 
 * @param {Array} customMiddleware - Дополнительные middleware
 * @param {Array} exclude - Middleware которые нужно исключить
 * @returns {Array} Массив middleware
 */
export const createCustomMiddlewareSet = (
  customMiddleware: any[] = [],
  exclude: string[] = []
) => {
  const available = {
    security: securityMiddlewareSet,
    logging: loggingMiddlewareSet,
    rateLimit: rateLimitMiddlewareSet,
    auth: authMiddlewareSet,
    registration: registrationMiddlewareSet,
    payment: paymentMiddlewareSet,
    caseOpening: caseOpeningMiddlewareSet,
    admin: adminMiddlewareSet,
    oauth: oauthMiddlewareSet,
    websocket: websocketMiddlewareSet
  };

  let result: any[] = [];

  // Добавляем стандартные middleware, если они не исключены
  if (!exclude.includes('security')) {
    result.push(...available.security);
  }
  if (!exclude.includes('logging')) {
    result.push(...available.logging);
  }
  if (!exclude.includes('rateLimit')) {
    result.push(...available.rateLimit);
  }

  // Добавляем кастомные middleware
  result.push(...customMiddleware);

  return result;
};

/**
 * Имена всех доступных middleware для удобного использования
 */
export const middlewareNames = {
  // Security
  security: 'securityMiddleware',
  cors: 'corsMiddleware',
  websocketSecurity: 'websocketSecurityMiddleware',
  apiSecurityHeaders: 'apiSecurityHeadersMiddleware',

  // Rate Limiters
  general: 'generalRateLimiter',
  auth: 'authRateLimiter',
  caseOpening: 'caseOpeningRateLimiter',
  payment: 'paymentRateLimiter',
  registration: 'registrationRateLimiter',
  passwordReset: 'passwordResetRateLimiter',
  oauth: 'oauthRateLimiter',
  admin: 'adminRateLimiter',
  websocket: 'websocketRateLimiter',

  // Logging
  requestLogger: 'requestLoggerMiddleware',
  performanceLogger: 'performanceLoggerMiddleware',
  morgan: 'morganMiddleware',
  errorLogger: 'errorLoggerMiddleware',

  // Error Handling
  errorHandler: 'errorHandler',
  notFoundHandler: 'notFoundHandler'

} as const;
