import { Router, type RequestHandler } from 'express';
import * as adminCaseController from '../../controllers/admin/adminCase.controller.js';
import {
  authenticate,
  requireAdmin,
  adminRateLimiter,
  validateCreateCase,
  validateUpdateCase,
  validateAddItemsToCase,
} from '../../middleware/index.js';

const router = Router();

// Все роуты требуют аутентификации + admin права + rate limit
router.use(authenticate, requireAdmin, adminRateLimiter);

// ==============================================
// ADMIN CASE ROUTES
// ==============================================

// Создать кейс
router.post('/', validateCreateCase, adminCaseController.createCase as RequestHandler);

// Обновить кейс
router.put('/:id', validateUpdateCase, adminCaseController.updateCase as RequestHandler);

// Удалить кейс
router.delete('/:id', adminCaseController.deleteCase as RequestHandler);

// Добавить предметы в кейс
router.post(
  '/:id/items',
  validateAddItemsToCase,
  adminCaseController.addItemsToCase as RequestHandler
);

export default router;
