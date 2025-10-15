import jwt from 'jsonwebtoken';
import { config } from '../config/env.config.js';
import { UnauthorizedError } from './errors.util.js';

/**
 * Интерфейс payload токена
 */
export interface JWTPayload {
  userId: string;
  role: string;
}

/**
 * Генерирует JWT токен
 */
export const generateToken = (payload: JWTPayload): string => {
  return jwt.sign(payload, config.jwt.secret, {
    expiresIn: '2h'
  });
};

/**
 * Верифицирует JWT токен
 */
export const verifyToken = (token: string): JWTPayload => {
  if (!token) {
    throw new jwt.JsonWebTokenError('Токен не предоставлен');
  }

  const cleanToken = token.replace(/^Bearer\s+/i, '');

  try {
    const decoded = jwt.verify(cleanToken, config.jwt.secret) as JWTPayload;

    if (!decoded.userId || !decoded.role) {
      throw new jwt.JsonWebTokenError('Неверная структура токена');
    }

    return decoded;
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      throw new UnauthorizedError('Неверный токен');
    } else if (error instanceof jwt.TokenExpiredError) {
      throw new UnauthorizedError('Токен истек');
    } else {
      throw new UnauthorizedError('Ошибка верификации токена');
    }
  }
};
