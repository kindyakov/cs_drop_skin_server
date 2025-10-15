import { Router, type RequestHandler } from 'express';
import * as authController from '../controllers/auth.controller.js';
import { authenticate } from '../middleware/index.js';

const router = Router();

// Steam OAuth
router.get('/steam', authController.steamAuth);
router.get('/steam/return', authController.steamCallback);

// VK OAuth
router.get('/vk', authController.vkAuth);
router.get('/vk/callback', authController.vkCallback);

// Protected
router.get('/me', authenticate, authController.getCurrentUser as RequestHandler);

export default router;
