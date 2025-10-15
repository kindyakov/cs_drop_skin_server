import { Request, Response, NextFunction } from 'express';
import { verifyToken } from '../utils/jwt.util.js';
import { UnauthorizedError, ForbiddenError } from '../utils/errors.util.js';
import { UserRoles, UserRole } from '../types/constants.js';

// Определяем тип для пользователя в middleware
interface AuthenticatedRequest extends Request {
  user?: {
    userId: string;
    role: UserRole;
  };
}

export const authenticate = async (req: Request, _res: Response, next: NextFunction) => {
  try {
    // 1. Получить токен из заголовка Authorization
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedError('Токен не предоставлен');
    }

    // 2. Извлечь токен
    const token = authHeader.split(' ')[1];

    // 3. Верифицировать токен
    const decoded = verifyToken(token);

    // 4. Добавить в req.user
    req.user = {
      userId: decoded.userId,
      role: decoded.role as UserRole,
    };

    next();
  } catch (error) {
    next(error);
  }
};

export const requireRole = (...roles: UserRole[]) => {
  return (req: AuthenticatedRequest, _res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        throw new UnauthorizedError('Требуется авторизация');
      }

      if (!roles.includes(req.user.role)) {
        throw new ForbiddenError('Недостаточно прав');
      }

      next();
    } catch (error) {
      next(error);
    }
  };
};

export const requireAdmin = requireRole(UserRoles.ADMIN);

// Экспортируем AuthenticatedRequest для использования в других файлах
export type { AuthenticatedRequest };
