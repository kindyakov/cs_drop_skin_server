import { body, validationResult } from 'express-validator';
import { Request, Response, NextFunction } from 'express';
import { ValidationError } from '../utils/index.js';

/**
 * Middleware для проверки результатов валидации
 */
export const handleValidationErrors = (
  req: Request,
  _res: Response,
  next: NextFunction
) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const errorMessages = errors.array().map(err => err.msg);
    throw new ValidationError(errorMessages.join(', '));
  }
  next();
};

/**
 * Валидация для открытия кейса
 */
export const validateCaseOpening = [
  body('caseId')
    .notEmpty()
    .withMessage('caseId обязателен')
    .isString()
    .withMessage('caseId должен быть строкой'),
  handleValidationErrors,
];

/**
 * Валидация для создания платежа
 */
export const validatePayment = [
  body('amount')
    .notEmpty()
    .withMessage('amount обязателен')
    .isInt({ min: 1000 })
    .withMessage('Минимальная сумма пополнения 10 рублей (1000 копеек)'),
  handleValidationErrors,
];
