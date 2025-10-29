import { Router } from 'express';
import { adminSkinsController } from '../../controllers/admin/adminSkins.controller.js';
import { authenticate, requireAdmin } from '../../middleware/auth.middleware.js';
import { createUserRateLimiter } from '../../middleware/rateLimiter.middleware.js';

const router = Router();

// ==============================================
// ADMIN SKINS ROUTES
// ==============================================

// Все роуты требуют аутентификации + admin права
router.use(authenticate);
router.use(requireAdmin as any);

// Rate limiter для синхронизации (5 запросов в 15 минут) - тяжелая операция
const syncRateLimiter = createUserRateLimiter(5, 15 * 60 * 1000);

// GET /api/v1/admin/skins - получить скины с фильтрами и пагинацией
router.get('/', adminSkinsController.getFilteredSkins);

// GET /api/v1/admin/skins/stats - получить статистику по скинам
router.get('/stats', adminSkinsController.getSkinsStats);

// GET /api/v1/admin/skins/filters - получить доступные фильтры
router.get('/filters', adminSkinsController.getAvailableFilters);

// GET /api/v1/admin/skins/:id - получить скин по ID
router.get('/:id', adminSkinsController.getSkinById);

// POST /api/v1/admin/skins/sync - ручная синхронизация с API с rate limiting
router.post('/sync', syncRateLimiter, adminSkinsController.syncSkinsFromApi);

export default router;
