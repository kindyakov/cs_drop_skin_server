import { Router } from 'express';
import * as userController from '../controllers/user.controller.js';
import {
  authenticate,
  checkUserBlocked,
  optionalAuth,
  validateTradeUrl,
} from '../middleware/index.js';

const router = Router();

// ==============================================
// USER ROUTES
// ==============================================

// ВАЖНО: Специфичные роуты ПЕРЕД параметризованными!

// Получить инвентарь текущего пользователя (требует авторизации)
router.get('/inventory', authenticate, checkUserBlocked, userController.getInventory as any);

// Получить историю открытий (требует авторизации)
router.get('/history', authenticate, checkUserBlocked, userController.getOpeningsHistory as any);

// Обновить trade URL (требует авторизации)
router.patch(
  '/trade-url',
  authenticate,
  checkUserBlocked,
  validateTradeUrl,
  userController.updateTradeUrl as any
);

// Получить профиль пользователя по ID (ПОСЛЕДНИЙ!)
router.get('/:id', userController.getUser as any);

export default router;
