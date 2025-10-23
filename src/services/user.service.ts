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

  // Конвертируем Decimal в number для price
  return items.map((userItem) => ({
    ...userItem,
    item: {
      ...userItem.item,
      price: userItem.item.price.toNumber(),
    },
  }));
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
  const inventoryRaw = await prisma.userItem.findMany({
    where: { userId, status: 'OWNED' },
    include: { item: true },
    orderBy: { acquiredAt: 'desc' },
    take: 21,
  });

  // Конвертируем Decimal в number для price
  const inventory = inventoryRaw.map((userItem) => ({
    ...userItem,
    item: {
      ...userItem.item,
      price: userItem.item.price.toNumber(),
    },
  }));

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

  const steamProfileUrl = user.steamId
    ? `https://steamcommunity.com/profiles/${user.steamId}`
    : null;

  // Базовый публичный профиль
  const publicProfile: IUserPublicProfile = {
    id: user.id,
    username: user.username,
    avatarUrl: user.avatarUrl,
    role: user.role as any,
    createdAt: user.createdAt,
    steamProfileUrl,
    favoriteCase: user.favoriteCase
      ? {
          ...user.favoriteCase,
          openingsCount: favoriteCaseOpeningsCount,
        }
      : null,
    bestDrop: user.bestDrop
      ? {
          ...user.bestDrop,
          price: user.bestDrop.price.toNumber(),
        }
      : null,
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

/**
 * Обновить статистику пользователя (favorite case и best drop)
 * Вызывается автоматически после открытия кейса
 */
export const updateUserStats = async (
  userId: string,
  caseId: string,
  itemId: string,
  itemPrice: number
): Promise<void> => {
  try {
    // Получить текущие данные пользователя
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        bestDropItemId: true,
      },
    });

    if (!user) {
      return;
    }

    // === ОБНОВЛЕНИЕ FAVORITE CASE ===
    // Найти самый часто открываемый кейс
    const caseStats = await prisma.caseOpening.groupBy({
      by: ['caseId'],
      where: { userId },
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } },
      take: 1,
    });

    const favoriteCaseId = caseStats[0]?.caseId || caseId;

    // === ОБНОВЛЕНИЕ BEST DROP ===
    let bestDropItemId = user.bestDropItemId;

    if (user.bestDropItemId) {
      // Если уже есть best drop - сравнить цены
      const currentBestDrop = await prisma.item.findUnique({
        where: { id: user.bestDropItemId },
        select: { price: true },
      });

      // Если новый предмет дороже - обновить
      if (!currentBestDrop || itemPrice > currentBestDrop.price.toNumber()) {
        bestDropItemId = itemId;
      }
    } else {
      // Если нет best drop - установить текущий предмет
      bestDropItemId = itemId;
    }

    // Обновить пользователя одним запросом
    await prisma.user.update({
      where: { id: userId },
      data: {
        favoriteCaseId,
        bestDropItemId,
      },
    });
  } catch (error) {
    // НЕ бросаем ошибку - это не должно прерывать основной функционал
    console.error('Ошибка обновления статистики пользователя:', error);
  }
};
