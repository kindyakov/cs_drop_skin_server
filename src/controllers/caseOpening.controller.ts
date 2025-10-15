import { Request, Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../middleware/auth.middleware.js';
import * as caseOpeningService from '../services/caseOpening.service.js';
import { successResponse } from '../utils/index.js';

export const openCase = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { caseId } = req.body;
    const userId = req.user!.userId;

    const result = await caseOpeningService.openCase(userId, caseId);
    successResponse(res, result, 'Кейс успешно открыт');
  } catch (error) {
    next(error);
  }
};

export const getRecentOpenings = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const limit = parseInt(req.query.limit as string) || 20;
    const openings = await caseOpeningService.getRecentOpenings(limit);
    successResponse(res, openings);
  } catch (error) {
    next(error);
  }
};
