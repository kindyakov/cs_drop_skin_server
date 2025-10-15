import { PrismaClient } from '@prisma/client';
import { ICase, ICaseWithItems } from '../types/index.js';
import { NotFoundError } from '../utils/index.js';

const prisma = new PrismaClient();

export const getAllActiveCases = async (): Promise<ICase[]> => {
  const cases = await prisma.case.findMany({
    where: { isActive: true },
    orderBy: { createdAt: 'desc' },
  });
  return cases;
};

export const getCaseBySlug = async (slug: string): Promise<ICaseWithItems> => {
  const caseData = await prisma.case.findUnique({
    where: { slug },
    include: {
      items: {
        include: { item: true },
        orderBy: { chancePercent: 'desc' },
      },
    },
  });

  if (!caseData) {
    throw new NotFoundError('Кейс не найден');
  }

  // Преобразовать в ICaseWithItems формат
  return {
    ...caseData,
    items: caseData.items.map(ci => ({
      id: ci.id,
      chancePercent: ci.chancePercent.toNumber(),
      item: ci.item,
    })),
  };
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
