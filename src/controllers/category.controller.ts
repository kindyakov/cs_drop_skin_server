import { Request, Response, NextFunction } from 'express';
import * as adminCategoryService from '../services/admin/adminCategory.service.js';
import { successResponse } from '../utils/index.js';

/**
 * Получить все активные категории (публичный endpoint)
 */
export const getActiveCategories = async (
  _req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const allCategories = await adminCategoryService.getAllCategories();
    // Фильтруем только активные
    const activeCategories = allCategories.filter(cat => cat.isActive);
    successResponse(res, activeCategories);
  } catch (error) {
    next(error);
  }
};

/**
 * Получить категорию с кейсами (публичный endpoint)
 */
export const getCategoryByIdPublic = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;
    const category = await adminCategoryService.getCategoryById(id);
    
    // Фильтруем только активные кейсы
    const categoryWithActiveCases = {
      ...category,
      cases: category.cases.filter(c => c.isActive),
    };
    
    successResponse(res, categoryWithActiveCases);
  } catch (error) {
    next(error);
  }
};
