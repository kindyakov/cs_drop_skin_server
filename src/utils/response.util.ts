import type { Response } from 'express';

/**
 * Отправляет успешный ответ
 */
export const successResponse = (
  res: Response,
  data: any,
  message?: string,
  statusCode: number = 200
): Response => {
  const response = {
    success: true,
    data,
    ...(message && { message })
  };

  return res.status(statusCode).json(response);
};

/**
 * Отправляет ответ с ошибкой
 */
export const errorResponse = (
  res: Response,
  message: string,
  statusCode: number = 500,
  errors?: any[]
): Response => {
  const response = {
    success: false,
    message,
    ...(errors && { errors })
  };

  return res.status(statusCode).json(response);
};
