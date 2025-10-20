import { Router } from 'express';
import * as adminStatsController from '../../controllers/admin/adminStats.controller.js';
import {
  authenticate,
  requireAdmin,
  adminRateLimiter,
} from '../../middleware/index.js';

const router = Router();

// Все роуты требуют аутентификации + admin права + rate limit
router.use(authenticate);
router.use(requireAdmin as any);
router.use(adminRateLimiter);

// ==============================================
// ADMIN STATS ROUTES
// ==============================================

// Получить статистику дашборда
router.get('/dashboard', adminStatsController.getDashboardStats as any);

// Получить популярные кейсы
router.get('/popular-cases', adminStatsController.getPopularCases as any);

// Получить недавние транзакции
router.get('/recent-transactions', adminStatsController.getRecentTransactions as any);

export default router;
