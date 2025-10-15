import { Router, type RequestHandler } from 'express';
import * as userController from '../controllers/user.controller.js';
import { authenticate } from '../middleware/index.js';

const router = Router();

// Все роуты требуют авторизации
router.get('/inventory', authenticate, userController.getInventory as RequestHandler);
router.get('/history', authenticate, userController.getOpeningsHistory as RequestHandler);

export default router;
