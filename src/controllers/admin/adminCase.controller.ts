import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../../middleware/auth.middleware.js';
import * as adminCaseService from '../../services/admin/adminCase.service.js';
import * as probabilityCalculationService from '../../services/probabilityCalculation.service.js';
import { successResponse } from '../../utils/index.js';
import { ICalculateProbabilitiesInput } from '../../types/probability.types.js';

/**
 * Получить все кейсы (для админки)
 */
export const getAllCases = async (
  _req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const cases = await adminCaseService.getAllCases();
    successResponse(res, cases, 'Список кейсов получен');
  } catch (error) {
    next(error);
  }
};

/**
 * Получить кейс по ID (для админки)
 */
export const getCaseById = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;
    const caseData = await adminCaseService.getCaseById(id);
    successResponse(res, caseData, 'Кейс получен');
  } catch (error) {
    next(error);
  }
};

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
    const { caseWithItems, warnings } = await adminCaseService.addItemsToCase(id, input);

    // Вернуть успешный результат с предупреждениями
    res.json({
      success: true,
      data: caseWithItems,
      warnings: warnings.length > 0 ? warnings : undefined,
      message: warnings.length > 0
        ? `Добавлено ${caseWithItems.items.length} скинов с ${warnings.length} ошибками`
        : 'Предметы успешно добавлены в кейс',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Рассчитать вероятности выпадения для списка скинов
 * Этот эндпоинт НЕ добавляет скины в кейс, а только возвращает рассчитанные вероятности
 * Используется для предпросмотра перед добавлением
 */
export const calculateProbabilities = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const input: ICalculateProbabilitiesInput = req.body;
    const result = await probabilityCalculationService.calculateProbabilities(input);

    res.json({
      success: true,
      data: result,
      message: result.warnings && result.warnings.length > 0
        ? `Вероятности рассчитаны для ${result.items.length} скинов с ${result.warnings.length} предупреждениями`
        : `Вероятности успешно рассчитаны для ${result.items.length} скинов`,
    });
  } catch (error) {
    next(error);
  }
};
