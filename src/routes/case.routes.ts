import { Router } from 'express';
import * as caseController from '../controllers/case.controller.js';

const router = Router();

// Публичные роуты (без авторизации)
router.get('/', caseController.getAllCases);
router.get('/:slug', caseController.getCaseBySlug);

export default router;
