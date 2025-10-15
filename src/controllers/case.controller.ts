import { Request, Response, NextFunction } from 'express';
import * as caseService from '../services/case.service.js';
import { successResponse } from '../utils/index.js';

export const getAllCases = async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const cases = await caseService.getAllActiveCases();
    successResponse(res, cases);
  } catch (error) {
    next(error);
  }
};

export const getCaseBySlug = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { slug } = req.params;
    const caseData = await caseService.getCaseBySlug(slug);
    successResponse(res, caseData);
  } catch (error) {
    next(error);
  }
};
