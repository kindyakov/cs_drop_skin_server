import { Router } from 'express';
import * as adminUserController from '../../controllers/admin/adminUser.controller.js';
import {
  authenticate,
  requireAdmin,
  adminRateLimiter,
  validateUpdateUserBalance,
} from '../../middleware/index.js';

const router = Router();

// Все роуты требуют аутентификации + admin права + rate limit
router.use(authenticate);
router.use(requireAdmin as any);
router.use(adminRateLimiter);

// ==============================================
// ADMIN USER ROUTES
// ==============================================

// Получить список пользователей
router.get('/', adminUserController.getAllUsers);

// Заблокировать/разблокировать пользователя
router.patch('/:id/toggle-block', adminUserController.toggleUserBlock as any);

// Обновить баланс пользователя
router.patch(
  '/:id/balance',
  validateUpdateUserBalance,
  adminUserController.updateUserBalance as any
);

export default router;
