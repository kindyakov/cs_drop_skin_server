import express, { Application, Request, Response, NextFunction } from 'express';

import { config } from './config/env.config.js';
import routes from './routes/index.js';

const app: Application = express();

// ==============================================
// BODY PARSING MIDDLEWARE
// ==============================================
app.use(express.json({ limit: '10mb' })); // Парсит JSON с ограничением размера
app.use(express.urlencoded({ extended: true, limit: '10mb' })); // Парсит URL-encoded данные

// ==============================================
// SECURITY & BASIC MIDDLEWARE (placeholders)
// ==============================================
// These will be implemented when respective middleware packages are installed
// app.use(helmet()); // Security headers
// app.use(cors({
//   origin: config.cors.origin,
//   credentials: true
// })); // CORS configuration
//
// // Rate limiting
// const limiter = rateLimit({
//   windowMs: config.rateLimit.windowMs,
//   max: config.rateLimit.maxRequests,
//   message: 'Too many requests from this IP, please try again later.'
// });
// app.use('/api/', limiter);

// ==============================================
// LOGGING MIDDLEWARE (placeholder)
// ==============================================
// This will be implemented when morgan is installed
// if (config.isDevelopment) {
//   app.use(morgan('dev'));
// } else {
//   app.use(morgan('combined'));
// }

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
    error: 'Route not found',
    message: 'The requested endpoint does not exist',
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
    error: 'Internal server error',
    message: config.isDevelopment ? err.message : 'Something went wrong',
    timestamp: new Date().toISOString(),
  });
});

export default app;
