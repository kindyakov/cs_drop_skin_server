import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../../middleware/auth.middleware.js';
import * as adminCaseService from '../../services/admin/adminCase.service.js';
import { successResponse } from '../../utils/index.js';

/**
 * Создать кейс
 */
export const createCase = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const input = req.body; // ICreateCaseInput
    const newCase = await adminCaseService.createCase(input);
    successResponse(res, newCase, 'Кейс успешно создан', 201);
  } catch (error) {
    next(error);
  }
};

/**
 * Обновить кейс
 */
export const updateCase = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;
    const input = req.body; // IUpdateCaseInput
    const updatedCase = await adminCaseService.updateCase(id, input);
    successResponse(res, updatedCase, 'Кейс успешно обновлён');
  } catch (error) {
    next(error);
  }
};

/**
 * Удалить кейс (soft delete)
 */
export const deleteCase = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;
    await adminCaseService.deleteCase(id);
    successResponse(res, null, 'Кейс успешно удалён');
  } catch (error) {
    next(error);
  }
};

/**
 * Добавить предметы в кейс
 */
export const addItemsToCase = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;
    const input = req.body; // IAddItemsToCaseInput
    const caseWithItems = await adminCaseService.addItemsToCase(id, input);
    successResponse(res, caseWithItems, 'Предметы успешно добавлены в кейс');
  } catch (error) {
    next(error);
  }
};
