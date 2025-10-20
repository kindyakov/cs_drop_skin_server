import { Request, Response, NextFunction } from 'express';
import * as adminStatsService from '../../services/admin/adminStats.service.js';
import { successResponse } from '../../utils/index.js';

/**
 * Получить статистику дашборда
 */
export const getDashboardStats = async (
  _req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const stats = await adminStatsService.getDashboardStats();
    successResponse(res, stats);
  } catch (error) {
    next(error);
  }
};

/**
 * Получить популярные кейсы
 */
export const getPopularCases = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const limit = parseInt(req.query.limit as string) || 10;
    const popularCases = await adminStatsService.getPopularCases(limit);
    successResponse(res, popularCases);
  } catch (error) {
    next(error);
  }
};

/**
 * Получить низавние транзакции
 */
export const getRecentTransactions = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const limit = parseInt(req.query.limit as string) || 20;
    const transactions = await adminStatsService.getRecentTransactions(limit);
    successResponse(res, transactions);
  } catch (error) {
    next(error);
  }
};
