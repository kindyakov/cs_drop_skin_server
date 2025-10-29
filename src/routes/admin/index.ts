import { Router } from 'express';
import adminCaseRoutes from './adminCase.routes.js';
import adminCategoryRoutes from './adminCategory.routes.js';
import adminUserRoutes from './adminUser.routes.js';
import adminStatsRoutes from './adminStats.routes.js';
import adminSkinsRoutes from './adminSkins.routes.js';

const router = Router();

// ==============================================
// ADMIN ROUTES
// ==============================================

router.use('/cases', adminCaseRoutes);
router.use('/categories', adminCategoryRoutes);
router.use('/users', adminUserRoutes);
router.use('/stats', adminStatsRoutes);
router.use('/skins', adminSkinsRoutes);

export default router;
