import { Router } from 'express';
import authRoutes from './auth.routes.js';
import caseRoutes from './case.routes.js';
import caseOpeningRoutes from './caseOpening.routes.js';
import userRoutes from './user.routes.js';
import paymentRoutes from './payment.routes.js';

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
// OPENINGS ROUTES - V1
// ==============================================
router.use('/v1/openings', caseOpeningRoutes);

// ==============================================
// USERS ROUTES - V1
// ==============================================
router.use('/v1/users', userRoutes);

// ==============================================
// PAYMENTS ROUTES - V1
// ==============================================
router.use('/v1/payments', paymentRoutes);

// ==============================================
// FUTURE ROUTES (placeholders)
// ==============================================
// router.use('/v1/admin', adminRoutes);
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
