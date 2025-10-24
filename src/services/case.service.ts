import { PrismaClient } from '@prisma/client';
import { ICase, ICaseWithItems, ICasePublic } from '../types/index.js';
import { NotFoundError } from '../utils/index.js';
import { logger } from '../middleware/logger.middleware.js';

const prisma = new PrismaClient();

export const getAllActiveCases = async (): Promise<ICasePublic[]> => {
  try {
    const cases = await prisma.case.findMany({
      where: { isActive: true },
      select: {
        id: true,
        name: true,
        slug: true,
        description: true,
        imageUrl: true,
        price: true,
        category: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
      },
      orderBy: { name: 'asc' },
    });

    // Конвертируем Decimal в number для price
    return cases.map((caseData) => ({
      ...caseData,
      price: caseData.price.toNumber(),
    }));
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
          orderBy: { chancePercent: 'asc' },
        },
      },
    });

    if (!caseData) {
      throw new NotFoundError('Кейс не найден');
    }

    // Конвертировать Decimal в number
    const formattedCase: ICaseWithItems = {
      ...caseData,
      price: caseData.price.toNumber(),
      items: caseData.items.map((ci) => ({
        id: ci.id,
        chancePercent: ci.chancePercent.toNumber(),
        item: {
          ...ci.item,
          price: ci.item.price.toNumber(),
        },
      })),
    };

    return formattedCase;
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

  return {
    ...caseData,
    price: caseData.price.toNumber(),
  };
};
