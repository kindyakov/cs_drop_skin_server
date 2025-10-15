import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
import * as userService from '../services/user.service';
import { successResponse } from '../utils';

export const getInventory = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = req.user!.userId;
    const inventory = await userService.getUserInventory(userId);
    successResponse(res, inventory);
  } catch (error) {
    next(error);
  }
};

export const getOpeningsHistory = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = req.user!.userId;
    const limit = parseInt(req.query.limit as string) || 50;
    const history = await userService.getUserOpenings(userId, limit);
    successResponse(res, history);
  } catch (error) {
    next(error);
  }
};
