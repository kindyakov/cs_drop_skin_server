import { Request, Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../middleware/auth.middleware.js';
import * as userService from '../services/user.service.js';
import { successResponse } from '../utils/index.js';

/**
 * Получить профиль пользователя по ID (публичный endpoint)
 */
export const getUser = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<Response | void> => {
  try {
    const { id } = req.params;
    const profile = await userService.getProfileById(id);

    if (!profile) {
      return res.status(404).json({
        success: false,
        message: 'Пользователь не найден',
      });
    }

    successResponse(res, profile);
  } catch (error) {
    next(error);
  }
};

/**
 * Получить инвентарь текущего пользователя (с пагинацией)
 */
export const getInventory = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user!.userId;
    const limit = parseInt(req.query.limit as string) || 21;
    const offset = parseInt(req.query.offset as string) || 0;

    const inventory = await userService.getUserInventory(userId, limit, offset);

    // Получить общее количество для информации
    const totalItems = await userService.getUserInventory(userId).then((items) => items.length);

    successResponse(res, {
      items: inventory,
      pagination: {
        limit,
        offset,
        total: totalItems,
        hasMore: offset + inventory.length < totalItems,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Получить историю открытий кейсов
 */
export const getOpeningsHistory = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user!.userId;
    const limit = parseInt(req.query.limit as string) || 50;

    const history = await userService.getUserOpenings(userId, limit);
    successResponse(res, history);
  } catch (error) {
    next(error);
  }
};

/**
 * Обновить trade URL пользователя
 */
export const updateTradeUrl = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user!.userId;
    const { tradeUrl } = req.body;

    await userService.updateUserTradeUrl(userId, tradeUrl);
    successResponse(res, null, 'Trade URL успешно обновлён');
  } catch (error) {
    next(error);
  }
};

/**
 * Продать скин обратно сайту за n% от цены
 */
export const sellItem = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user!.userId;
    const { id: userItemId } = req.params;

    const result = await userService.sellUserItem(userId, userItemId);
    successResponse(res, result, 'Скин успешно продан');
  } catch (error) {
    next(error);
  }
};

/**
 * Продать все предметы пользователя со статусом OWNED
 */
export const sellAllItems = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user!.userId;

    const result = await userService.sellAllUserItems(userId);
    successResponse(
      res,
      result,
      `Успешно продано предметов: ${result.totalSold} на сумму ${(result.totalAmount / 100).toFixed(2)}₽`
    );
  } catch (error) {
    next(error);
  }
};
