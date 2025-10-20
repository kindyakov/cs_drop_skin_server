import { Request, Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../../middleware/auth.middleware.js';
import * as adminUserService from '../../services/admin/adminUser.service.js';
import { successResponse } from '../../utils/index.js';
import type { IGetUsersFilters } from '../../types/admin.types.js';

/**
 * Получить список пользователей
 */
export const getAllUsers = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const filters: IGetUsersFilters = {
      role: req.query.role as 'USER' | 'ADMIN' | undefined,
      search: req.query.search as string | undefined,
      limit: req.query.limit ? parseInt(req.query.limit as string) : 50,
      offset: req.query.offset ? parseInt(req.query.offset as string) : 0,
    };

    const users = await adminUserService.getAllUsers(filters);
    successResponse(res, users);
  } catch (error) {
    next(error);
  }
};

/**
 * Заблокировать/разблокировать пользователя
 */
export const toggleUserBlock = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;
    const updatedUser = await adminUserService.toggleUserBlock(id);
    successResponse(
      res,
      updatedUser,
      `Пользователь ${updatedUser.isBlocked ? 'заблокирован' : 'разблокирован'}`
    );
  } catch (error) {
    next(error);
  }
};

/**
 * Обновить баланс пользователя
 */
export const updateUserBalance = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;
    const input = req.body; // IUpdateUserBalanceInput
    const updatedUser = await adminUserService.updateUserBalance(id, input);
    successResponse(res, updatedUser, 'Баланс пользователя обновлён');
  } catch (error) {
    next(error);
  }
};
