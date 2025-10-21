import { Router } from 'express';
import authRoutes from './auth.routes';
import caseRoutes from './case.routes';
import caseOpeningRoutes from './caseOpening.routes';
import userRoutes from './user.routes';
import paymentRoutes from './payment.routes';
import categoryRoutes from './category.routes';
import adminRoutes from './admin/index';

// Основной роутер приложения
const router = Router();

// ==============================================
// API VERSION 1.0
// ==============================================
router.use('/v1', (req, _res, next) => {
  req.apiVersion = '1.0';
  next();
});

// ==============================================
// AUTHENTICATION ROUTES - V1
// ==============================================
router.use('/v1/auth', authRoutes);

// ==============================================
// CASES ROUTES - V1
// ==============================================
router.use('/v1/cases', caseRoutes);

// ==============================================
// CATEGORIES ROUTES - V1
// ==============================================
router.use('/v1/categories', categoryRoutes);

// ==============================================
// OPENINGS ROUTES - V1
// ==============================================
router.use('/v1/openings', caseOpeningRoutes);

// ==============================================
// USERS ROUTES - V1
// ==============================================
router.use('/v1/user', userRoutes);

// ==============================================
// PAYMENTS ROUTES - V1
// ==============================================
router.use('/v1/payments', paymentRoutes);

// ==============================================
// ADMIN ROUTES - V1
// ==============================================
router.use('/v1/admin', adminRoutes);

// ==============================================
// FUTURE ROUTES (placeholders)
// ==============================================
// router.use('/v1/transactions', transactionRoutes);
// router.use('/v1/market', marketRoutes);

export default router;

// Расширяем интерфейс Request для API версии
declare global {
  namespace Express {
    interface Request {
      apiVersion?: string;
    }
  }
}
