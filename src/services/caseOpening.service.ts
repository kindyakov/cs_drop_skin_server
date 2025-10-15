import { PrismaClient } from '@prisma/client';
import { ICaseOpeningResult, ILiveFeedEvent } from '../types/index.js';
import { ValidationError, NotFoundError } from '../utils/index.js';

const prisma = new PrismaClient();

const selectRandomItem = (items: Array<{ itemId: string; chancePercent: number }>) => {
  const random = Math.random() * 100;
  let cumulative = 0;

  for (const caseItem of items) {
    cumulative += caseItem.chancePercent;
    if (random <= cumulative) {
      return caseItem.itemId;
    }
  }

  return items[items.length - 1].itemId;
};

export const openCase = async (
  userId: string,
  caseId: string
): Promise<ICaseOpeningResult> => {
  return await prisma.$transaction(async (tx) => {
    // 1. Получить пользователя с блокировкой
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

    // 3. Проверить баланс
    const casePrice = caseData.price;
    if (user.balance < casePrice) {
      throw new ValidationError('Недостаточно средств');
    }

    // 4. Выбрать случайный предмет
    const selectedItemId = selectRandomItem(
      caseData.items.map(ci => ({
        itemId: ci.itemId,
        chancePercent: ci.chancePercent.toNumber(),
      }))
    );

    // 5. Получить предмет
    const item = await tx.item.findUnique({
      where: { id: selectedItemId },
    });

    if (!item) {
      throw new NotFoundError('Предмет не найден');
    }

    // 6. Списать баланс
    await tx.user.update({
      where: { id: userId },
      data: { balance: user.balance - casePrice },
    });

    // 7. Добавить предмет в инвентарь
    await tx.userItem.create({
      data: {
        userId,
        itemId: item.id,
      },
    });

    // 8. Записать историю
    await tx.caseOpening.create({
      data: {
        userId,
        caseId,
        itemId: item.id,
      },
    });

    return {
      success: true,
      item,
      newBalance: user.balance - casePrice,
    };
  });
};

export const getRecentOpenings = async (limit = 20): Promise<ILiveFeedEvent[]> => {
  const openings = await prisma.caseOpening.findMany({
    take: limit,
    orderBy: { openedAt: 'desc' },
    include: {
      user: { select: { username: true, avatarUrl: true } },
      case: { select: { name: true, imageUrl: true } },
      item: { select: { displayName: true, imageUrl: true, rarity: true } },
    },
  });

  return openings.map(opening => ({
    id: opening.id,
    username: opening.user.username,
    userAvatar: opening.user.avatarUrl,
    caseName: opening.case.name,
    caseImage: opening.case.imageUrl,
    itemName: opening.item.displayName,
    itemImage: opening.item.imageUrl,
    itemRarity: opening.item.rarity,
    openedAt: opening.openedAt,
  }));
};
