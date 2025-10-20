import { PrismaClient } from '@prisma/client';
import { ICase, ICaseWithItems } from '../types/index.js';
import { NotFoundError } from '../utils/index.js';
import { logger } from '../middleware/logger.middleware.js';

const prisma = new PrismaClient();

export const getAllActiveCases = async (): Promise<ICase[]> => {
  try {
    const cases = await prisma.case.findMany({
      where: { isActive: true },
      include: {
        category: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return cases;
  } catch (error) {
    logger.error('Ошибка получения кейсов', { error });
    throw error;
  }
};

export const getCaseBySlug = async (slug: string): Promise<ICaseWithItems> => {
  try {
    const caseData = await prisma.case.findUnique({
      where: { slug },
      include: {
        category: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
        items: {
          include: { item: true },
          orderBy: { chancePercent: 'desc' },
        },
      },
    });

    if (!caseData) {
      throw new NotFoundError('Кейс не найден');
    }

    // Конвертировать Decimal в number
    const formattedCase = {
      ...caseData,
      items: caseData.items.map((ci) => ({
        ...ci,
        chancePercent: Number(ci.chancePercent),
      })),
    };

    return formattedCase as ICaseWithItems;
  } catch (error) {
    logger.error('Ошибка получения кейса', { error, slug });
    throw error;
  }
};

export const getCaseById = async (id: string): Promise<ICase> => {
  const caseData = await prisma.case.findUnique({
    where: { id },
  });

  if (!caseData) {
    throw new NotFoundError('Кейс не найден');
  }

  return caseData;
};
