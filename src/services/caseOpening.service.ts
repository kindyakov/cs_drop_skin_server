import { PrismaClient } from '@prisma/client';
import { ICaseOpeningResult, ILiveFeedEvent } from '../types/index.js';
import { ValidationError, NotFoundError } from '../utils/index.js';
import { emitCaseOpening } from '../config/socket.config.js';
import { logger } from '../middleware/logger.middleware.js';
import * as userService from './user.service.js';
import { calculateSellPrice } from '../config/business.config.js';

const prisma = new PrismaClient();

const selectRandomItem = (items: Array<{ itemId: string; chancePercent: number }>) => {
  const random = Math.random() * 100;
  let cumulative = 0;

  for (const caseItem of items) {
    cumulative += caseItem.chancePercent;
    if (random < cumulative) {
      return caseItem.itemId;
    }
  }

  return items[items.length - 1].itemId;
};

export const openCase = async (userId: string, caseId: string): Promise<ICaseOpeningResult> => {
  const result = await prisma.$transaction(async (tx) => {
    // 1. Получить пользователя
    const user = await tx.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundError('Пользователь не найден');
    }

    // 2. Получить кейс с предметами
    const caseData = await tx.case.findUnique({
      where: { id: caseId },
      include: { items: true },
    });

    if (!caseData || !caseData.isActive) {
      throw new NotFoundError('Кейс не найден или неактивен');
    }

    // 3. Проверить баланс (цена теперь в копейках)
    const casePrice = caseData.price;
    if (user.balance < casePrice) {
      throw new ValidationError('Недостаточно средств');
    }

    // 4. Выбрать случайный предмет
    const selectedItemId = selectRandomItem(
      caseData.items.map((ci) => ({
        itemId: ci.itemId,
        chancePercent: ci.chancePercent.toNumber(),
      }))
    );

    // 5. Получить предмет
    const wonItem = await tx.item.findUnique({
      where: { id: selectedItemId },
    });

    if (!wonItem) {
      throw new NotFoundError('Предмет не найден');
    }

    // 6. Списать баланс
    await tx.user.update({
      where: { id: userId },
      data: { balance: user.balance - casePrice },
    });

    // 7. Добавить предмет в инвентарь
    const userItem = await tx.userItem.create({
      data: {
        userId,
        itemId: wonItem.id,
      },
    });

    // 8. Записать историю
    const newOpening = await tx.caseOpening.create({
      data: {
        userId,
        caseId,
        itemId: wonItem.id,
      },
    });

    // 9. Инкрементировать счётчик открытий кейса (для метрик)
    await tx.case.update({
      where: { id: caseId },
      data: { openingsCount: { increment: 1 } },
    });

    const newBalance = user.balance - casePrice;

    return {
      user,
      caseData,
      userItem,
      wonItem,
      newOpening,
      newBalance,
    };
  });

  // === WEBSOCKET BROADCAST ===
  // Эмитить событие в live-feed
  try {
    emitCaseOpening({
      id: result.newOpening.id,
      userId: result.user.id,
      username: result.user.username,
      userAvatar: result.user.avatarUrl,
      skinName: result.wonItem.skinName,
      weaponName: result.wonItem.weaponName,
      imageUrl: result.wonItem.imageUrl,
      rarity: result.wonItem.rarity,
      displayName: result.wonItem.displayName,
      caseName: result.caseData.name,
      caseSlug: result.caseData.slug,
      caseImageUrl: result.caseData.imageUrl,
      openedAt: result.newOpening.openedAt,
    });
  } catch (emitError) {
    // Не прерываем выполнение если emit не удался
    logger.warn('Не удалось отправить событие в live-feed', { emitError });
  }

  // === USER STATS UPDATE ===
  // Обновить статистику пользователя (favorite case, best drop)
  try {
    await userService.updateUserStats(userId, caseId, result.wonItem.id, result.wonItem.price);
  } catch (statsError) {
    // Не прерываем выполнение если обновление статистики не удалось
    logger.warn('Не удалось обновить статистику пользователя', {
      statsError,
      userId,
      caseId,
    });
  }

  // Рассчитать цену продажи (n% от рыночной цены)
  const sellPrice = calculateSellPrice(result.wonItem.price);

  logger.info('Кейс успешно открыт', {
    userId,
    caseId,
    itemId: result.wonItem.id,
    newBalance: result.newBalance,
    itemPrice: result.wonItem.price,
    sellPrice,
  });

  return {
    success: true,
    userItem: result.userItem,
    item: {
      ...result.wonItem,
      price: result.wonItem.price,
      sellPrice,
    },
    newBalance: result.newBalance,
  };
};

export const getRecentOpenings = async (limit = 20): Promise<ILiveFeedEvent[]> => {
  const openings = await prisma.caseOpening.findMany({
    take: limit,
    orderBy: { openedAt: 'desc' },
    include: {
      user: { select: { id: true, username: true, avatarUrl: true } },
      case: { select: { name: true, slug: true, imageUrl: true } },
      item: {
        select: {
          displayName: true,
          weaponName: true,
          skinName: true,
          imageUrl: true,
          rarity: true,
        },
      },
    },
  });

  return openings.map((opening) => ({
    id: opening.id,
    userId: opening.user.id,
    username: opening.user.username,
    userAvatar: opening.user.avatarUrl,
    skinName: opening.item.skinName,
    weaponName: opening.item.weaponName,
    imageUrl: opening.item.imageUrl,
    rarity: opening.item.rarity,
    displayName: opening.item.displayName,
    caseName: opening.case.name,
    caseSlug: opening.case.slug,
    caseImageUrl: opening.case.imageUrl,
    openedAt: opening.openedAt,
  }));
};
