import { Router } from 'express';
import adminCaseRoutes from './adminCase.routes.js';
import adminCategoryRoutes from './adminCategory.routes.js';
import adminUserRoutes from './adminUser.routes.js';

const router = Router();

// ==============================================
// ADMIN ROUTES
// ==============================================

router.use('/cases', adminCaseRoutes);
router.use('/categories', adminCategoryRoutes);
router.use('/users', adminUserRoutes);

// Placeholder для будущих admin роутов
// router.use('/stats', adminStatsRoutes);

export default router;
