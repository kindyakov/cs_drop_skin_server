import { PrismaClient } from '@prisma/client';
import type { IUserItem, IUserPublicProfile } from '../types/index.js';

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
    where: { userId, status: { in: ['OWNED', 'SOLD', 'WITHDRAWN'] } },
    include: { item: true },
    orderBy: { acquiredAt: 'desc' },
    take: limit,
    skip: offset,
  });

  // Получить информацию о кейсах для каждого предмета через CaseOpening
  const itemIds = items.map((ui) => ui.itemId);
  const caseOpenings = await prisma.caseOpening.findMany({
    where: {
      userId,
      itemId: { in: itemIds },
    },
    include: {
      case: {
        select: {
          slug: true,
          imageUrl: true,
        },
      },
    },
    orderBy: { openedAt: 'desc' },
  });

  // Создать мапу itemId -> case info
  const itemToCaseMap = new Map<string, { slug: string; imageUrl: string }>();
  caseOpenings.forEach((opening) => {
    if (!itemToCaseMap.has(opening.itemId)) {
      itemToCaseMap.set(opening.itemId, {
        slug: opening.case.slug,
        imageUrl: opening.case.imageUrl,
      });
    }
  });

  // Конвертируем Decimal в number для price и добавляем информацию о кейсе
  return items.map((userItem) => {
    const caseInfo = itemToCaseMap.get(userItem.itemId);
    return {
      ...userItem,
      item: {
        ...userItem.item,
        price: userItem.item.price.toNumber(),
      },
      case: caseInfo || null,
    };
  });
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
 * Возвращает публичный профиль
 */
export const getProfileById = async (userId: string): Promise<IUserPublicProfile | null> => {
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
          weaponName: true,
          skinName: true,
          categoryName: true,
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
    where: { userId, status: { in: ['OWNED', 'SOLD', 'WITHDRAWN'] } },
    include: { item: true },
    orderBy: { acquiredAt: 'desc' },
    take: 21,
  });

  // Получить информацию о кейсах для каждого предмета через CaseOpening
  const userItemIds = inventoryRaw.map((ui) => ui.itemId);
  const caseOpenings = await prisma.caseOpening.findMany({
    where: {
      userId,
      itemId: { in: userItemIds },
    },
    include: {
      case: {
        select: {
          slug: true,
          imageUrl: true,
        },
      },
    },
    orderBy: { openedAt: 'desc' },
  });

  // Создать мапу itemId -> case info (берем последнее открытие для каждого предмета)
  const itemToCaseMap = new Map<string, { slug: string; imageUrl: string }>();
  caseOpenings.forEach((opening) => {
    if (!itemToCaseMap.has(opening.itemId)) {
      itemToCaseMap.set(opening.itemId, {
        slug: opening.case.slug,
        imageUrl: opening.case.imageUrl,
      });
    }
  });

  // Конвертируем Decimal в number для price и добавляем информацию о кейсе
  const inventory = inventoryRaw.map((userItem) => {
    const caseInfo = itemToCaseMap.get(userItem.itemId);
    return {
      ...userItem,
      item: {
        ...userItem.item,
        price: userItem.item.price.toNumber(),
      },
      case: caseInfo || null, // Добавляем информацию о кейсе (slug и imageUrl)
    };
  });

  // Получить общее количество предметов
  const totalItems = await prisma.userItem.count({
    where: { userId, status: { in: ['OWNED', 'SOLD', 'WITHDRAWN'] } },
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

  const vkProfileUrl = user.vkId ? `https://vk.com/id${user.vkId}` : null;

  // Базовый публичный профиль
  const publicProfile: IUserPublicProfile = {
    id: user.id,
    username: user.username,
    avatarUrl: user.avatarUrl,
    createdAt: user.createdAt,
    steamProfileUrl,
    vkProfileUrl,
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
