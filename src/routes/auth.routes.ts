import { Router, type RequestHandler } from 'express';
import * as authController from '../controllers/auth.controller.js';
import { authenticate } from '../middleware/index.js';

const router = Router();

// Steam OAuth
router.get('/steam', authController.steamAuth);
router.get('/steam/return', authController.steamCallback);

// VK ID OAuth 2.1 (new implementation)
router.get('/vkid', authController.vkIdAuth as RequestHandler);
router.get('/vkid/callback', authController.vkIdCallback as RequestHandler);

// Protected
router.get('/me', authenticate, authController.getCurrentUser as RequestHandler);

export default router;
