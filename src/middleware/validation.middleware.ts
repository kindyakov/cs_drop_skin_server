import { Request, Response, NextFunction } from 'express';
import { body, validationResult } from 'express-validator';
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
    .isFloat({ min: 10.0 })
    .withMessage('price должен быть положительным числом'),
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
  body('price')
    .optional()
    .isFloat({ min: 0.01 })
    .withMessage('price должен быть положительным числом'),
  body('description').optional().isString().withMessage('description должен быть строкой'),
  body('isActive').optional().isBoolean().withMessage('isActive должен быть boolean'),
  handleValidationErrors,
];

/**
 * Валидация для добавления предметов в кейс (Admin)
 */
export const validateAddItemsToCase = [
  body('items').isArray({ min: 1 }).withMessage('items должен быть непустым массивом'),
  body('items.*.marketHashName')
    .notEmpty()
    .withMessage('marketHashName обязателен')
    .isString()
    .withMessage('marketHashName должен быть строкой')
    .isLength({ min: 3, max: 255 })
    .withMessage('marketHashName должен быть от 3 до 255 символов'),
  body('items.*.chancePercent')
    .notEmpty()
    .withMessage('chancePercent обязателен')
    .isFloat({ min: 0.01, max: 100 })
    .withMessage('chancePercent должен быть от 0.01 до 100'),
  // Проверка суммы всех шансов - не должна превышать 100%
  body('items').custom((items) => {
    const totalChance = items.reduce((sum: number, item: any) => sum + parseFloat(item.chancePercent), 0);
    const roundedTotal = Math.round(totalChance * 100) / 100; // Округляем для избежания ошибок с float

    if (roundedTotal > 100.01) { // Допуск 0.01% для погрешности float
      throw new Error(`Сумма шансов ${roundedTotal}% превышает максимум 100%. Пожалуйста, уменьшите значения.`);
    }
    return true;
  }),
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
  body('description').optional().isString().withMessage('description должен быть строкой'),
  body('imageUrl').optional().isString().withMessage('imageUrl должен быть строкой'),
  body('order')
    .optional()
    .isInt({ min: 0 })
    .withMessage('order должен быть неотрицательным числом'),
  body('isActive').optional().isBoolean().withMessage('isActive должен быть boolean'),
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
  body('description').optional().isString().withMessage('description должен быть строкой'),
  body('imageUrl').optional().isString().withMessage('imageUrl должен быть строкой'),
  body('order')
    .optional()
    .isInt({ min: 0 })
    .withMessage('order должен быть неотрицательным числом'),
  body('isActive').optional().isBoolean().withMessage('isActive должен быть boolean'),
  handleValidationErrors,
];

/**
 * Валидация для назначения кейсов категории (Admin)
 */
export const validateAssignCases = [
  body('caseIds').isArray({ min: 1 }).withMessage('caseIds должен быть непустым массивом'),
  body('caseIds.*').isString().withMessage('Каждый caseId должен быть строкой'),
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

/**
 * Валидация для обновления trade URL
 */
export const validateTradeUrl = [
  body('tradeUrl')
    .notEmpty()
    .withMessage('tradeUrl обязателен')
    .isString()
    .withMessage('tradeUrl должен быть строкой')
    .matches(/^https:\/\/steamcommunity\.com\/tradeoffer\/new\/\?partner=\d+&token=[a-zA-Z0-9_-]+$/)
    .withMessage(
      'Неверный формат Steam trade URL. Пример: https://steamcommunity.com/tradeoffer/new/?partner=123456789&token=AbCdEfGh'
    ),
  handleValidationErrors,
];

/**
 * Валидация для расчета вероятностей (Admin)
 * Используется для предпросмотра вероятностей перед добавлением скинов в кейс
 */
export const validateCalculateProbabilities = [
  body('marketHashNames')
    .isArray({ min: 1, max: 50 })
    .withMessage('marketHashNames должен быть массивом от 1 до 50 элементов'),
  body('marketHashNames.*')
    .isString()
    .withMessage('Каждый элемент marketHashNames должен быть строкой')
    .isLength({ min: 3, max: 255 })
    .withMessage('Каждый marketHashName должен быть от 3 до 255 символов'),
  body('algorithm')
    .notEmpty()
    .withMessage('algorithm обязателен')
    .isString()
    .withMessage('algorithm должен быть строкой')
    .isIn(['price', 'rarity', 'combined'])
    .withMessage('algorithm должен быть одним из: price, rarity, combined'),
  body('options')
    .optional()
    .isObject()
    .withMessage('options должен быть объектом'),
  body('options.minChance')
    .optional()
    .isFloat({ min: 0.01, max: 100 })
    .withMessage('minChance должен быть от 0.01 до 100'),
  body('options.maxChance')
    .optional()
    .isFloat({ min: 0.01, max: 100 })
    .withMessage('maxChance должен быть от 0.01 до 100'),
  // Проверка, что maxChance >= minChance
  body('options').custom((options) => {
    if (options && options.minChance && options.maxChance) {
      if (parseFloat(options.minChance) > parseFloat(options.maxChance)) {
        throw new Error('minChance не может быть больше maxChance');
      }
    }
    return true;
  }),
  handleValidationErrors,
];
