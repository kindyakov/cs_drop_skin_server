import { Router } from 'express';
import adminCaseRoutes from './adminCase.routes.js';

const router = Router();

// ==============================================
// ADMIN ROUTES
// ==============================================

router.use('/cases', adminCaseRoutes);

// Placeholder для будущих admin роутов
// router.use('/users', adminUserRoutes);
// router.use('/stats', adminStatsRoutes);

export default router;
