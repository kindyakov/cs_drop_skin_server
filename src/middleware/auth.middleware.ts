import { Request, Response, NextFunction } from 'express';
import { verifyToken } from '../utils/jwt.util.js';
import { UnauthorizedError, ForbiddenError } from '../utils/errors.util.js';
import { UserRoles, UserRole } from '../types/constants.js';
import { logger } from './logger.middleware.js';
import { prisma } from '../config/database.js';

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

/**
 * Middleware для проверки admin роли с детальным логированием
 */
export const requireAdmin = (req: AuthenticatedRequest, _res: Response, next: NextFunction) => {
  if (!req.user) {
    logger.warn('Попытка доступа к admin роуту без авторизации', {
      ip: req.ip,
      path: req.path,
    });
    throw new UnauthorizedError('Требуется авторизация');
  }

  if (req.user.role !== UserRoles.ADMIN) {
    logger.warn('Попытка доступа к admin роуту без прав', {
      userId: req.user.userId,
      role: req.user.role,
      ip: req.ip,
      path: req.path,
    });
    throw new ForbiddenError('Доступ запрещён. Требуются права администратора');
  }

  logger.info('Admin доступ разрешён', {
    userId: req.user.userId,
    path: req.path,
  });

  next();
};

/**
 * Middleware для проверки блокировки пользователя
 */
export const checkUserBlocked = async (req: AuthenticatedRequest, _res: Response, next: NextFunction) => {
  if (!req.user) {
    return next();
  }

  try {
    // Получить пользователя из БД для проверки актуального статуса
    const user = await prisma.user.findUnique({
      where: { id: req.user.userId },
      select: { isBlocked: true },
    });

    if ((user as any)?.isBlocked) {
      logger.warn('Заблокированный пользователь пытался получить доступ', {
        userId: req.user.userId,
        path: req.path,
      });
      throw new ForbiddenError('Ваш аккаунт заблокирован. Обратитесь к администратору');
    }

    next();
  } catch (error) {
    next(error);
  }
};

// Экспортируем AuthenticatedRequest для использования в других файлах
export type { AuthenticatedRequest };
