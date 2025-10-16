import express, { Application, Request, Response, NextFunction } from 'express';

import { config } from './config/env.config.js';
import routes from './routes/index.js';
import { securityMiddleware, corsMiddleware } from './middleware/security.middleware.js';
import { morganMiddleware } from './middleware/logger.middleware.js';
import { generalRateLimiter } from './middleware/rateLimiter.middleware.js';

const app: Application = express();

// ==============================================
// BODY PARSING MIDDLEWARE
// ==============================================
app.use(express.json({ limit: '10mb' })); // Парсит JSON с ограничением размера
app.use(express.urlencoded({ extended: true, limit: '10mb' })); // Парсит URL-encoded данные

// ==============================================
// SECURITY & BASIC MIDDLEWARE
// ==============================================
app.use(securityMiddleware); // Security headers через Helmet
app.use(corsMiddleware); // CORS configuration

// Rate limiting для API endpoints
app.use('/api/', generalRateLimiter);

// ==============================================
// LOGGING MIDDLEWARE
// ==============================================
app.use(morganMiddleware); // HTTP request logging

// ==============================================
// HEALTH CHECK ENDPOINT
// ==============================================
app.get('/health', (_req: Request, res: Response) => {
  res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: config.nodeEnv,
  });
});

// ==============================================
// API ROUTES
// ==============================================
// Все роуты приложения через централизованный router
app.use('/api', routes);

// ==============================================
// 404 HANDLER
// ==============================================
app.use((_req: Request, res: Response) => {
  res.status(404).json({
    error: 'Маршрут не найден',
    message: 'Запрошенная конечная точка не существует',
    timestamp: new Date().toISOString(),
  });
});

// ==============================================
// GLOBAL ERROR HANDLER
// ==============================================
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  // Log error details
  console.error('Application Error:', {
    message: err.message,
    stack: config.isDevelopment ? err.stack : undefined,
    timestamp: new Date().toISOString(),
  });

  // Send error response
  res.status(500).json({
    error: 'Внутренняя ошибка сервера',
    message: config.isDevelopment ? err.message : 'Что-то пошло не так',
    timestamp: new Date().toISOString(),
  });
});

export default app;
