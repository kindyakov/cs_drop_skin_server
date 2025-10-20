import { PrismaClient } from '@prisma/client';
import type {
  ICreateCaseInput,
  IUpdateCaseInput,
  IAddItemsToCaseInput,
} from '../../types/admin.types.js';
import type { ICase, ICaseWithItems } from '../../types/case.types.js';
import { slugify } from '../../utils/helpers.util.js';
import { NotFoundError, ValidationError } from '../../utils/errors.util.js';
import { logger } from '../../middleware/logger.middleware.js';

const prisma = new PrismaClient();

/**
 * Создать новый кейс
 */
export const createCase = async (input: ICreateCaseInput): Promise<ICase> => {
  try {
    // 1. Сгенерировать slug из name
    const slug = slugify(input.name);

    // 2. Проверить уникальность slug
    const existingCase = await prisma.case.findUnique({ where: { slug } });
    if (existingCase) {
      throw new ValidationError('Кейс с таким названием уже существует');
    }

    // 3. Создать кейс
    const newCase = await prisma.case.create({
      data: {
        name: input.name,
        slug,
        description: input.description,
        imageUrl: input.imageUrl,
        price: input.price,
        categoryId: input.categoryId,
        isActive: input.isActive ?? true,
      },
    });

    logger.info('Кейс создан', { caseId: newCase.id, name: newCase.name });
    return newCase;
  } catch (error) {
    logger.error('Ошибка создания кейса', { error, input });
    throw error;
  }
};

/**
 * Обновить кейс
 */
export const updateCase = async (
  id: string,
  input: IUpdateCaseInput
): Promise<ICase> => {
  try {
    // 1. Проверить существование кейса
    const existingCase = await prisma.case.findUnique({ where: { id } });
    if (!existingCase) {
      throw new NotFoundError('Кейс не найден');
    }

    // 2. Если меняется name, пересоздать slug и проверить уникальность
    let slug = existingCase.slug;
    if (input.name && input.name !== existingCase.name) {
      slug = slugify(input.name);
      const slugExists = await prisma.case.findFirst({
        where: { slug, NOT: { id } },
      });
      if (slugExists) {
        throw new ValidationError('Кейс с таким названием уже существует');
      }
    }

    // 3. Обновить кейс
    const updatedCase = await prisma.case.update({
      where: { id },
      data: {
        name: input.name,
        slug: input.name ? slug : undefined,
        description: input.description,
        imageUrl: input.imageUrl,
        price: input.price,
        categoryId: input.categoryId,
        isActive: input.isActive,
      },
    });

    logger.info('Кейс обновлён', { caseId: id });
    return updatedCase;
  } catch (error) {
    logger.error('Ошибка обновления кейса', { error, id, input });
    throw error;
  }
};

/**
 * Удалить кейс (soft delete)
 */
export const deleteCase = async (id: string): Promise<void> => {
  try {
    // 1. Проверить существование кейса
    const existingCase = await prisma.case.findUnique({ where: { id } });
    if (!existingCase) {
      throw new NotFoundError('Кейс не найден');
    }

    // 2. Soft delete - установить isActive = false
    await prisma.case.update({
      where: { id },
      data: { isActive: false },
    });

    logger.info('Кейс деактивирован', { caseId: id });
  } catch (error) {
    logger.error('Ошибка удаления кейса', { error, id });
    throw error;
  }
};

/**
 * Добавить предметы в кейс
 */
export const addItemsToCase = async (
  caseId: string,
  input: IAddItemsToCaseInput
): Promise<ICaseWithItems> => {
  try {
    // 1. Проверить существование кейса
    const existingCase = await prisma.case.findUnique({ where: { id: caseId } });
    if (!existingCase) {
      throw new NotFoundError('Кейс не найден');
    }

    // 2. Валидация: сумма шансов должна быть 100%
    const totalChance = input.items.reduce((sum, item) => sum + item.chancePercent, 0);
    if (Math.abs(totalChance - 100) > 0.01) {
      // допуск на погрешность
      throw new ValidationError(
        `Сумма шансов должна быть 100%. Текущая сумма: ${totalChance}%`
      );
    }

    // 3. Проверить существование всех предметов
    const itemIds = input.items.map(item => item.itemId);
    const items = await prisma.item.findMany({
      where: { id: { in: itemIds } },
    });
    if (items.length !== itemIds.length) {
      throw new NotFoundError('Один или несколько предметов не найдены');
    }

    // 4. Добавить предметы в кейс (в транзакции)
    await prisma.$transaction(
      input.items.map(item =>
        prisma.caseItem.create({
          data: {
            caseId,
            itemId: item.itemId,
            chancePercent: item.chancePercent,
          },
        })
      )
    );

    // 5. Вернуть кейс с предметами
    const caseWithItems = await prisma.case.findUnique({
      where: { id: caseId },
      include: {
        items: {
          include: { item: true },
          orderBy: { chancePercent: 'desc' },
        },
      },
    });

    logger.info('Предметы добавлены в кейс', {
      caseId,
      itemsCount: input.items.length,
    });

    if (!caseWithItems) {
      throw new NotFoundError('Кейс не найден');
    }

    const formattedCase: ICaseWithItems = {
      ...caseWithItems,
      items: caseWithItems.items.map(caseItem => ({
        id: caseItem.id,
        chancePercent: caseItem.chancePercent.toNumber(),
        item: caseItem.item,
      })),
    };

    return formattedCase;
  } catch (error) {
    logger.error('Ошибка добавления предметов в кейс', { error, caseId, input });
    throw error;
  }
};
