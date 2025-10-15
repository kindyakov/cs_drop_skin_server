import winston from 'winston';
import morgan from 'morgan';
import type { Request, Response, NextFunction } from 'express';
import { config } from '../config/env.config.js';

/**
 * Определение уровней логирования
 */
enum LogLevel {
  ERROR = 'error',
  WARN = 'warn',
  INFO = 'info',
  DEBUG = 'debug'
}

/**
 * Кастомный формат для Winston логов
 */
const logFormat = winston.format.combine(
  winston.format.timestamp({
    format: 'YYYY-MM-DD HH:mm:ss'
  }),
  winston.format.errors({ stack: true }),
  winston.format.json(),
  winston.format.printf(({ timestamp, level, message, stack, ...meta }) => {
    let logMessage = `${timestamp} [${level.toUpperCase()}]: ${message}`;
    
    // Добавляем stack trace для ошибок
    if (stack) {
      logMessage += `\n${stack}`;
    }
    
    // Добавляем дополнительные метаданные
    if (Object.keys(meta).length > 0) {
      logMessage += ` ${JSON.stringify(meta)}`;
    }
    
    return logMessage;
  })
);

/**
 * Формат для консольных логов в development
 */
const consoleFormat = winston.format.combine(
  winston.format.colorize(),
  winston.format.timestamp({
    format: 'HH:mm:ss'
  }),
  winston.format.printf(({ timestamp, level, message, stack, ...meta }) => {
    let logMessage = `${timestamp} ${level}: ${message}`;
    
    if (stack) {
      logMessage += `\n${stack}`;
    }
    
    if (Object.keys(meta).length > 0) {
      logMessage += ` ${JSON.stringify(meta, null, 2)}`;
    }
    
    return logMessage;
  })
);

/**
 * Создание Winston logger
 */
export const logger = winston.createLogger({
  level: config.logging.level,
  format: logFormat,
  defaultMeta: {
    service: 'csdrop-server',
    environment: config.nodeEnv,
    pid: process.pid
  },
  transports: [
    // Транспорт для ошибок
    new winston.transports.File({
      filename: 'logs/error.log',
      level: LogLevel.ERROR,
      maxsize: 5 * 1024 * 1024, // 5MB
      maxFiles: 5,
      tailable: true
    }),
    
    // Транспорт для всех логов
    new winston.transports.File({
      filename: 'logs/combined.log',
      maxsize: 10 * 1024 * 1024, // 10MB
      maxFiles: 10,
      tailable: true
    })
  ],
  
  // Обработка исключений
  exceptionHandlers: [
    new winston.transports.File({
      filename: 'logs/exceptions.log',
      maxsize: 5 * 1024 * 1024, // 5MB
      maxFiles: 3
    })
  ],
  
  // Обработка rejection логов
  rejectionHandlers: [
    new winston.transports.File({
      filename: 'logs/rejections.log',
      maxsize: 5 * 1024 * 1024, // 5MB
      maxFiles: 3
    })
  ]
});

// Добавляем консольный логгер для development
if (config.isDevelopment) {
  logger.add(new winston.transports.Console({
    format: consoleFormat,
    level: LogLevel.DEBUG
  }));
}

/**
 * Morgan middleware форматирования логов HTTP запросов
 */
const morganFormat = ':method :url :status :res[content-length] - :response-time ms :remote-addr';

/**
 * Создание Morgan stream для Winston
 */
const morganStream = {
  write: (message: string) => {
    // Удаляем перенос строки в конце
    const cleanMessage = message.trim();
    
    // Определяем уровень логирования на основе статуса
    let logLevel = LogLevel.INFO;
    
    if (cleanMessage.includes(' 4')) {
      logLevel = LogLevel.WARN;
    } else if (cleanMessage.includes(' 5')) {
      logLevel = LogLevel.ERROR;
    }
    
    logger.log(logLevel, cleanMessage, {
      type: 'http_request'
    });
  }
};

/**
 * Morgan middleware для логирования HTTP запросов
 */
export const morganMiddleware = morgan(morganFormat, {
  stream: morganStream,
  // Пропускаем логирование health check в production
  skip: (req: Request) => {
    if (config.isProduction && req.path === '/health') {
      return true;
    }
    return false;
  }
});

/**
 * Middleware для логирования деталей запроса
 * 
 * @param {Request} req - Express request
 * @param {Response} res - Express response
 * @param {NextFunction} next - Express next function
 */
export const requestLoggerMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const start = Date.now();
  
  // Логируем начало запроса
  logger.debug('Request started', {
    method: req.method,
    url: req.url,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    contentType: req.get('Content-Type'),
    requestId: req.get('X-Request-ID') || `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  });
  
  // Добавляем trace ID к запросу
  req.traceId = req.get('X-Request-ID') || `trace_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  // Логируем окончание запроса
  res.on('finish', () => {
    const duration = Date.now() - start;
    
    logger.info('Request completed', {
      method: req.method,
      url: req.url,
      statusCode: res.statusCode,
      duration: `${duration}ms`,
      ip: req.ip,
      traceId: req.traceId,
      userAgent: req.get('User-Agent')
    });
  });
  
  next();
};

/**
 * Middleware для логирования ошибок приложений
 * 
 * @param {Error} err - Error object
 * @param {Request} req - Express request
 * @param {Response} res - Express response
 * @param {NextFunction} next - Express next function
 */
export const errorLoggerMiddleware = (err: Error, req: Request, _res: Response, next: NextFunction) => {
  logger.error('Application error', {
    error: {
      message: err.message,
      stack: err.stack,
      name: err.name
    },
    request: {
      method: req.method,
      url: req.url,
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      traceId: req.traceId
    },
    timestamp: new Date().toISOString()
  });
  
  next(err);
};

/**
 * Middleware для логирования производительности запросов
 * 
 * @param {Request} req - Express request
 * @param {Response} res - Express response  
 * @param {NextFunction} next - Express next function
 */
export const performanceLoggerMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const start = process.hrtime.bigint();
  
  res.on('finish', () => {
    const duration = process.hrtime.bigint() - start;
    const durationMs = Number(duration) / 1000000; // Convert to milliseconds
    
    // Логируем медленные запросы (> 1 секунда)
    if (durationMs > 1000) {
      logger.warn('Slow request detected', {
        method: req.method,
        url: req.url,
        duration: `${durationMs.toFixed(2)}ms`,
        ip: req.ip,
        traceId: req.traceId
      });
    }
    
    // Логируем очень медленные запросы (> 5 секунд) с уровнем error
    if (durationMs > 5000) {
      logger.error('Very slow request detected', {
        method: req.method,
        url: req.url,
        duration: `${durationMs.toFixed(2)}ms`,
        ip: req.ip,
        traceId: req.traceId
      });
    }
  });
  
  next();
};

/**
 * Middleware для логирования действий пользователей
 * 
 * @param {string} action - Описание действия
 * @returns {Function} Express middleware
 */
export const userActionLogger = (action: string) => {
  return (req: Request, _res: Response, next: NextFunction) => {
    const user = req.user as any;
    
    logger.info('User action', {
      action,
      userId: user?.id,
      userRole: user?.role,
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      method: req.method,
      url: req.url,
      traceId: req.traceId,
      timestamp: new Date().toISOString()
    });
    
    next();
  };
};

/**
 * Логирование безопасности событий
 * 
 * @param {string} event - Тип события
 * @param {object} details - Детали события
 */
export const securityLogger = (event: string, details: object) => {
  logger.warn('Security event', {
    event,
    ...details,
    timestamp: new Date().toISOString()
  });
};

/**
 * Логирование бизнес событий
 * 
 * @param {string} event - Тип события
 * @param {object} details - Детали события
 */
export const businessLogger = (event: string, details: object) => {
  logger.info('Business event', {
    event,
    ...details,
    timestamp: new Date().toISOString()
  });
};

// Расширяем интерфейсы Request для traceId
declare global {
  namespace Express {
    interface Request {
      traceId?: string;
    }
  }
}

export default logger;
