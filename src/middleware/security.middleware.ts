import helmet from 'helmet';
import cors from 'cors';
import type { Request, Response, NextFunction } from 'express';
import { config } from '../config/env.config.js';

/**
 * Настройка безопасности HTTP заголовков через Helmet
 * 
 * @returns {Function} Express middleware для применения security headers
 */
export const securityMiddleware = helmet();

/**
 * Настройка CORS (Cross-Origin Resource Sharing)
 * Упрощенная версия для Render
 * 
 * @returns {Function} Express middleware для CORS
 */
export const corsMiddleware = cors({
  origin: '*', // Разрешаем все домены в production
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: [
    'Origin',
    'X-Requested-With',
    'Content-Type',
    'Accept',
    'Authorization',
    'Cache-Control',
    'Pragma'
  ],
  exposedHeaders: ['X-Total-Count', 'X-Page-Count'],
  maxAge: 86400,
  preflightContinue: false,
  optionsSuccessStatus: 204
});

/**
 * Middleware для безопасности WebSocket соединений
 * 
 * @param {Request} req - Express request
 * @param {Response} res - Express response  
 * @param {NextFunction} next - Express next function
 */
export const websocketSecurityMiddleware = (req: Request, res: Response, next: NextFunction) => {
  // Проверяем заголовок Origin для WebSocket_upgrade запросов
  if (req.headers.upgrade === 'websocket') {
    const origin = req.headers.origin;
    
    // В development разрешаем любой origin для WebSocket
    if (config.isDevelopment) {
      return next();
    }
    
    // В production проверяем origin
    const allowedOrigins = config.cors.origin.split(',').map(o => o.trim());
    if (!origin || (allowedOrigins.includes('*') || allowedOrigins.includes(origin))) {
      return next();
    }
    
    return res.status(403).json({
      error: 'Forbidden',
      message: 'WebSocket connection not allowed from this origin'
    });
  }
  
  next();
};

/**
 * Middleware для проверки безопасных заголовков для API
 * 
 * @param {Request} req - Express request
 * @param {Response} res - Express response  
 * @param {NextFunction} next - Express next function
 */
export const apiSecurityHeadersMiddleware = (req: Request, res: Response, next: NextFunction) => {
  // Устанавливаем дополнительные заголовки безопасности для API
  res.setHeader('X-API-Version', '1.0.0');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  
  // Для API endpoints устанавливаем строгие заголовки кеширования
  if (req.path.startsWith('/api/')) {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
  }
  
  next();
};
