import { Request, Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../../middleware/auth.middleware.js';
import * as adminCategoryService from '../../services/admin/adminCategory.service.js';
import { successResponse } from '../../utils/index.js';

/**
 * Получить все категории
 */
export const getAllCategories = async (
  _req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const categories = await adminCategoryService.getAllCategories();
    successResponse(res, categories);
  } catch (error) {
    next(error);
  }
};

/**
 * Получить категорию по ID с кейсами
 */
export const getCategoryById = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;
    const category = await adminCategoryService.getCategoryById(id);
    successResponse(res, category);
  } catch (error) {
    next(error);
  }
};

/**
 * Создать категорию
 */
export const createCategory = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const input = req.body; // ICreateCategoryInput
    const newCategory = await adminCategoryService.createCategory(input);
    successResponse(res, newCategory, 'Категория успешно создана', 201);
  } catch (error) {
    next(error);
  }
};

/**
 * Обновить категорию
 */
export const updateCategory = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;
    const input = req.body; // IUpdateCategoryInput
    const updatedCategory = await adminCategoryService.updateCategory(id, input);
    successResponse(res, updatedCategory, 'Категория успешно обновлена');
  } catch (error) {
    next(error);
  }
};

/**
 * Удалить категорию (soft delete)
 */
export const deleteCategory = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;
    await adminCategoryService.deleteCategory(id);
    successResponse(res, null, 'Категория успешно удалена');
  } catch (error) {
    next(error);
  }
};

/**
 * Назначить кейсы категории
 */
export const assignCasesToCategory = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;
    const input = req.body; // IAssignCasesToCategoryInput
    const categoryWithCases = await adminCategoryService.assignCasesToCategory(id, input);
    successResponse(res, categoryWithCases, 'Кейсы успешно назначены категории');
  } catch (error) {
    next(error);
  }
};
