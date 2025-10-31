import { Request, Response, NextFunction } from 'express';
import * as caseService from '../services/case.service.js';
import { successResponse } from '../utils/index.js';
import { ICaseFilters } from '../types/index.js';

export const getAllCases = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Извлекаем параметры фильтрации из query string
    const filters: ICaseFilters = {};

    if (req.query.search && typeof req.query.search === 'string') {
      filters.search = req.query.search.trim();
    }

    if (req.query.from) {
      const from = Number(req.query.from);
      if (!isNaN(from) && from >= 0) {
        filters.from = from;
      }
    }

    if (req.query.to) {
      const to = Number(req.query.to);
      if (!isNaN(to) && to >= 0) {
        filters.to = to;
      }
    }

    const cases = await caseService.getAllActiveCases(filters);
    successResponse(res, cases);
  } catch (error) {
    next(error);
  }
};

export const getFilteredCases = async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const filters = await caseService.getFilteredCases();
    successResponse(res, filters);
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
