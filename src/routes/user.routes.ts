import { Router } from 'express';
import * as userController from '../controllers/user.controller.js';
import { authenticate } from '../middleware/index.js';

const router = Router();

// Все роуты требуют авторизации
router.get('/inventory', authenticate, userController.getInventory as any);
router.get('/history', authenticate, userController.getOpeningsHistory as any);
router.get('/:id', userController.getUser);

export default router;
