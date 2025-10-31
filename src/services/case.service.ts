import { PrismaClient, Prisma } from '@prisma/client';
import { ICase, ICaseWithItems, ICasePublic, IFiltersCases, ICaseFilters } from '../types/index.js';
import { NotFoundError } from '../utils/index.js';
import { logger } from '../middleware/logger.middleware.js';

const prisma = new PrismaClient();

export const getAllActiveCases = async (filters?: ICaseFilters): Promise<ICasePublic[]> => {
  try {
    // Строим условия фильтрации
    const where: Prisma.CaseWhereInput = {
      isActive: true,
    };

    // Фильтрация по названию (поиск)
    if (filters?.search) {
      where.name = {
        contains: filters.search,
        mode: 'insensitive', // Регистронезависимый поиск
      };
    }

    // Фильтрация по диапазону цен
    if (filters?.from !== undefined || filters?.to !== undefined) {
      where.price = {};

      if (filters.from !== undefined) {
        where.price.gte = filters.from;
      }

      if (filters.to !== undefined) {
        where.price.lte = filters.to;
      }
    }

    const cases = await prisma.case.findMany({
      where,
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
    logger.error('Ошибка получения кейсов', { error, filters });
    throw error;
  }
};

export const getFilteredCases = async (): Promise<IFiltersCases> => {
  try {
    const result = await prisma.case.aggregate({
      where: { isActive: true },
      _min: {
        price: true,
      },
      _max: {
        price: true,
      },
    });

    return {
      from: result._min.price?.toNumber() ?? 0,
      to: result._max.price?.toNumber() ?? 0,
    };
  } catch (error) {
    logger.error('Ошибка получения фильтров для кейсов', { error });
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
