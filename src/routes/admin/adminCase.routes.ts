import { Router } from 'express';
import * as adminCaseController from '../../controllers/admin/adminCase.controller.js';
import {
  authenticate,
  requireAdmin,
  adminRateLimiter,
  validateCreateCase,
  validateUpdateCase,
  validateAddItemsToCase,
  validateCalculateProbabilities,
} from '../../middleware/index.js';

const router = Router();

// Все роуты требуют аутентификации + admin права + rate limit
router.use(authenticate);
router.use(requireAdmin as any);
router.use(adminRateLimiter);

// ==============================================
// ADMIN CASE ROUTES
// ==============================================

// Получить все кейсы (включая неактивные)
router.get('/', adminCaseController.getAllCases as any);

// Получить кейс по ID
router.get('/:id', adminCaseController.getCaseById as any);

// Создать кейс
router.post('/', validateCreateCase, adminCaseController.createCase as any);

// Обновить кейс
router.put('/:id', validateUpdateCase, adminCaseController.updateCase as any);

// Удалить кейс
router.delete('/:id', adminCaseController.deleteCase as any);

// Рассчитать вероятности для списка скинов (предпросмотр перед добавлением)
router.post(
  '/calculate-probabilities',
  validateCalculateProbabilities,
  adminCaseController.calculateProbabilities as any
);

// Добавить предметы в кейс
router.post(
  '/:id/items',
  validateAddItemsToCase,
  adminCaseController.addItemsToCase as any
);

export default router;
