import { Router, type RequestHandler } from 'express';
import * as categoryController from '../controllers/category.controller.js';

const router = Router();

// Публичные роуты (без авторизации)
router.get('/', categoryController.getActiveCategories);
router.get('/:id', categoryController.getCategoryByIdPublic as RequestHandler);

export default router;
