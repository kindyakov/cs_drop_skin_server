import type { Request, Response, NextFunction } from 'express';
import passport from '../config/passport.config.js';
import { generateToken } from '../utils/jwt.util.js';
import { successResponse } from '../utils/response.util.js';
import { PrismaClient } from '@prisma/client';
import { NotFoundError } from '../utils/errors.util.js';
import { type AuthenticatedRequest } from '../middleware/auth.middleware.js';

const prisma = new PrismaClient();

export const steamAuth = passport.authenticate('steam');

export const steamCallback = [
  passport.authenticate('steam', { session: false, failureRedirect: '/auth/failure' }),
  (req: Request, res: Response) => {
    const user = req.user as any;
    const token = generateToken({ userId: user.userId, role: user.role });
    res.redirect(
      `${process.env.FRONTEND_URL || 'http://localhost:3000'}/auth/success?token=${token}`
    );
  },
];

export const vkAuth = passport.authenticate('vkontakte');

export const vkCallback = [
  passport.authenticate('vkontakte', { session: false, failureRedirect: '/auth/failure' }),
  (req: Request, res: Response) => {
    const user = req.user as any;
    const token = generateToken({ userId: user.userId, role: user.role });
    res.redirect(
      `${process.env.FRONTEND_URL || 'http://localhost:3000'}/auth/success?token=${token}`
    );
  },
];

export const getCurrentUser = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.userId },
      select: {
        id: true,
        username: true,
        avatarUrl: true,
        balance: true,
        role: true,
        createdAt: true,
      },
    });

    if (!user) {
      throw new NotFoundError('Пользователь не найден');
    }

    successResponse(res, user);
  } catch (error) {
    next(error);
  }
};
