import { Router, type RequestHandler } from 'express';
import * as caseOpeningController from '../controllers/caseOpening.controller.js';
import { authenticate, caseOpeningRateLimiter } from '../middleware/index.js';

const router = Router();

// Открытие кейса (защищено + rate limit)
router.post(
  '/open',
  authenticate,
  caseOpeningRateLimiter,
  caseOpeningController.openCase as RequestHandler
);

// Live-лента (публичный endpoint)
router.get('/recent', caseOpeningController.getRecentOpenings);

export default router;
