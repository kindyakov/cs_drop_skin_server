import { Router, type RequestHandler } from 'express';
import * as adminCategoryController from '../../controllers/admin/adminCategory.controller.js';
import {
  authenticate,
  requireAdmin,
  adminRateLimiter,
  validateCreateCategory,
  validateUpdateCategory,
  validateAssignCases,
} from '../../middleware/index.js';

const router = Router();

// Все роуты требуют аутентификации + admin права + rate limit
router.use(authenticate as any, requireAdmin as any, adminRateLimiter);

// ==============================================
// ADMIN CATEGORY ROUTES
// ==============================================

// Получить все категории
router.get('/', adminCategoryController.getAllCategories);

// Получить категорию по ID с кейсами
router.get('/:id', adminCategoryController.getCategoryById);

// Создать категорию
router.post('/', validateCreateCategory, adminCategoryController.createCategory as RequestHandler);

// Обновить категорию
router.put(
  '/:id',
  validateUpdateCategory,
  adminCategoryController.updateCategory as RequestHandler
);

// Удалить категорию
router.delete('/:id', adminCategoryController.deleteCategory as RequestHandler);

// Назначить кейсы категории
router.post(
  '/:id/assign-cases',
  validateAssignCases,
  adminCategoryController.assignCasesToCategory as RequestHandler
);

export default router;
