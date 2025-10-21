import { PrismaClient } from '@prisma/client';
import type { IUserItem, IUserPublicProfile, IUserExtendedProfile } from '../types/index.js';

const prisma = new PrismaClient();

/**
 * Получить инвентарь пользователя с пагинацией
 */
export const getUserInventory = async (
  userId: string,
  limit: number = 21,
  offset: number = 0
): Promise<IUserItem[]> => {
  const items = await prisma.userItem.findMany({
    where: { userId, status: 'OWNED' },
    include: { item: true },
    orderBy: { acquiredAt: 'desc' },
    take: limit,
    skip: offset,
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

/**
 * Получить профиль пользователя по ID
 * Возвращает публичный профиль или расширенный (если запрашивает свой)
 */
export const getProfileById = async (
  userId: string,
  requestingUserId?: string
): Promise<IUserPublicProfile | IUserExtendedProfile | null> => {
  // Получить пользователя с favorite case и best drop
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      favoriteCase: {
        select: {
          id: true,
          name: true,
          slug: true,
          imageUrl: true,
        },
      },
      bestDrop: {
        select: {
          id: true,
          displayName: true,
          imageUrl: true,
          price: true,
          rarity: true,
        },
      },
    },
  });

  if (!user) {
    return null;
  }

  // Получить первые 21 предмет инвентаря (сортировка по дате получения)
  const inventory = await prisma.userItem.findMany({
    where: { userId, status: 'OWNED' },
    include: { item: true },
    orderBy: { acquiredAt: 'desc' },
    take: 21,
  });

  // Получить общее количество предметов
  const totalItems = await prisma.userItem.count({
    where: { userId, status: 'OWNED' },
  });

  // Проверить, есть ли ещё предметы для подгрузки
  const hasMore = totalItems > 21;

  // Получить количество открытий favorite case
  let favoriteCaseOpeningsCount = 0;
  if (user.favoriteCaseId) {
    favoriteCaseOpeningsCount = await prisma.caseOpening.count({
      where: {
        userId,
        caseId: user.favoriteCaseId,
      },
    });
  }

  // Базовый публичный профиль
  const publicProfile: IUserPublicProfile = {
    id: user.id,
    username: user.username,
    avatarUrl: user.avatarUrl,
    role: user.role as any,
    createdAt: user.createdAt,
    favoriteCase: user.favoriteCase
      ? {
          ...user.favoriteCase,
          openingsCount: favoriteCaseOpeningsCount,
        }
      : null,
    bestDrop: user.bestDrop,
    inventory,
    totalItems,
    hasMore,
  };

  // Если пользователь запрашивает СВОЙ профиль - вернуть расширенные данные
  const isOwnProfile = requestingUserId && requestingUserId === userId;

  if (isOwnProfile) {
    const extendedProfile: IUserExtendedProfile = {
      ...publicProfile,
      balance: user.balance,
      tradeUrl: user.tradeUrl,
      isBlocked: user.isBlocked,
    };

    return extendedProfile;
  }

  return publicProfile;
};

/**
 * Обновить trade URL пользователя
 */
export const updateUserTradeUrl = async (userId: string, tradeUrl: string): Promise<void> => {
  await prisma.user.update({
    where: { id: userId },
    data: { tradeUrl },
  });
};
