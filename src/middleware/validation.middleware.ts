import { body, validationResult } from 'express-validator';
import { Request, Response, NextFunction } from 'express';
import { ValidationError } from '../utils/index.js';

/**
 * Middleware для проверки результатов валидации
 */
export const handleValidationErrors = (req: Request, _res: Response, next: NextFunction) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const errorMessages = errors.array().map((err) => err.msg);
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

/**
 * Валидация для создания кейса (Admin)
 */
export const validateCreateCase = [
  body('name')
    .notEmpty()
    .withMessage('name обязателен')
    .isString()
    .withMessage('name должен быть строкой')
    .isLength({ min: 3, max: 100 })
    .withMessage('name должен быть от 3 до 100 символов'),
  body('imageUrl')
    .notEmpty()
    .withMessage('imageUrl обязателен')
    .isString()
    .withMessage('imageUrl должен быть строкой'),
  body('price')
    .notEmpty()
    .withMessage('price обязателен')
    .isInt({ min: 1 })
    .withMessage('price должен быть положительным числом в копейках'),
  body('description').optional().isString().withMessage('description должен быть строкой'),
  body('isActive').optional().isBoolean().withMessage('isActive должен быть boolean'),
  handleValidationErrors,
];

/**
 * Валидация для обновления кейса (Admin)
 */
export const validateUpdateCase = [
  body('name')
    .optional()
    .isString()
    .withMessage('name должен быть строкой')
    .isLength({ min: 3, max: 100 })
    .withMessage('name должен быть от 3 до 100 символов'),
  body('imageUrl').optional().isString().withMessage('imageUrl должен быть строкой'),
  body('price').optional().isInt({ min: 1 }).withMessage('price должен быть положительным числом'),
  body('description').optional().isString().withMessage('description должен быть строкой'),
  body('isActive').optional().isBoolean().withMessage('isActive должен быть boolean'),
  handleValidationErrors,
];

/**
 * Валидация для добавления предметов в кейс (Admin)
 */
export const validateAddItemsToCase = [
  body('items').isArray({ min: 1 }).withMessage('items должен быть непустым массивом'),
  body('items.*.itemId')
    .notEmpty()
    .withMessage('itemId обязателен')
    .isString()
    .withMessage('itemId должен быть строкой'),
  body('items.*.chancePercent')
    .notEmpty()
    .withMessage('chancePercent обязателен')
    .isFloat({ min: 0.01, max: 100 })
    .withMessage('chancePercent должен быть от 0.01 до 100'),
  handleValidationErrors,
];

/**
 * Валидация для создания категории (Admin)
 */
export const validateCreateCategory = [
  body('name')
    .notEmpty()
    .withMessage('name обязателен')
    .isString()
    .withMessage('name должен быть строкой')
    .isLength({ min: 3, max: 100 })
    .withMessage('name должен быть от 3 до 100 символов'),
  body('description')
    .optional()
    .isString()
    .withMessage('description должен быть строкой'),
  body('imageUrl')
    .optional()
    .isString()
    .withMessage('imageUrl должен быть строкой'),
  body('order')
    .optional()
    .isInt({ min: 0 })
    .withMessage('order должен быть неотрицательным числом'),
  body('isActive')
    .optional()
    .isBoolean()
    .withMessage('isActive должен быть boolean'),
  handleValidationErrors,
];

/**
 * Валидация для обновления категории (Admin)
 */
export const validateUpdateCategory = [
  body('name')
    .optional()
    .isString()
    .withMessage('name должен быть строкой')
    .isLength({ min: 3, max: 100 })
    .withMessage('name должен быть от 3 до 100 символов'),
  body('description')
    .optional()
    .isString()
    .withMessage('description должен быть строкой'),
  body('imageUrl')
    .optional()
    .isString()
    .withMessage('imageUrl должен быть строкой'),
  body('order')
    .optional()
    .isInt({ min: 0 })
    .withMessage('order должен быть неотрицательным числом'),
  body('isActive')
    .optional()
    .isBoolean()
    .withMessage('isActive должен быть boolean'),
  handleValidationErrors,
];

/**
 * Валидация для назначения кейсов категории (Admin)
 */
export const validateAssignCases = [
  body('caseIds')
    .isArray({ min: 1 })
    .withMessage('caseIds должен быть непустым массивом'),
  body('caseIds.*')
    .isString()
    .withMessage('Каждый caseId должен быть строкой'),
  handleValidationErrors,
];

/**
 * Валидация для обновления баланса пользователя (Admin)
 */
export const validateUpdateUserBalance = [
  body('amount')
    .notEmpty()
    .withMessage('amount обязателен')
    .isInt()
    .withMessage('amount должен быть целым числом в копейках'),
  body('reason')
    .optional()
    .isString()
    .withMessage('reason должен быть строкой')
    .isLength({ max: 500 })
    .withMessage('reason не должен превышать 500 символов'),
  handleValidationErrors,
];




