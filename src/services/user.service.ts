import { PrismaClient } from '@prisma/client';
import type { IUserItem } from '../types';

const prisma = new PrismaClient();

// Получить инвентарь пользователя
export const getUserInventory = async (userId: string): Promise<IUserItem[]> => {
  const items = await prisma.userItem.findMany({
    where: { userId, status: 'OWNED' },
    include: { item: true },
    orderBy: { acquiredAt: 'desc' },
  });

  return items;
};

// Получить историю открытий
export const getUserOpenings = async (userId: string, limit = 50) => {
  const openings = await prisma.caseOpening.findMany({
    where: { userId },
    take: limit,
    orderBy: { openedAt: 'desc' },
    include: {
      case: { select: { name: true, imageUrl: true } },
      item: { select: { displayName: true, imageUrl: true, rarity: true, price: true } },
    },
  });

  return openings;
};
