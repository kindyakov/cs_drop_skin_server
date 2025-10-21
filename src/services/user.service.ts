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

export const getUserById = async (userId: string) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      steamId: true,
      username: true,
      avatarUrl: true,
      createdAt: true,
    },
  });

  if (!user) {
    return null;
  }

  // Формирование ссылки на Steam профиль
  const steamProfileUrl = user.steamId 
    ? `https://steamcommunity.com/profiles/${user.steamId}`
    : null;

  // Получить все предметы пользователя со статусом OWNED
  const userItems = await prisma.userItem.findMany({
    where: { 
      userId,
      status: 'OWNED',
    },
    include: {
      item: true,
    },
    orderBy: { acquiredAt: 'desc' },
  });

  // Получить все открытия пользователя
  const openings = await prisma.caseOpening.findMany({
    where: { userId },
    include: {
      case: {
        select: {
          id: true,
          name: true,
          slug: true,
          imageUrl: true,
        },
      },
    },
  });

  // Создать map для быстрого поиска кейса по itemId
  const itemToCaseMap = new Map();
  openings.forEach((opening) => {
    // Если несколько открытий одного предмета, берем последнее
    if (!itemToCaseMap.has(opening.itemId)) {
      itemToCaseMap.set(opening.itemId, opening.case);
    }
  });

  // Объединить userItems с информацией о кейсах
  const itemsWithCases = userItems.map((userItem) => ({
    id: userItem.id,
    acquiredAt: userItem.acquiredAt,
    status: userItem.status,
    item: {
      ...userItem.item,
      price: userItem.item.price, // Цена в копейках
    },
    case: itemToCaseMap.get(userItem.itemId) || null,
  }));

  return {
    id: user.id,
    username: user.username,
    avatarUrl: user.avatarUrl,
    steamProfileUrl,
    createdAt: user.createdAt,
    items: itemsWithCases,
  };
};
