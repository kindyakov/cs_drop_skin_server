import { PrismaClient } from '@prisma/client';
import type {
  ICreateCaseInput,
  IUpdateCaseInput,
  IAddItemsToCaseInput,
} from '../../types/admin.types.js';
import type { ICase, ICaseWithItems } from '../../types/case.types.js';
import type { ItemRarity } from '../../types/constants.js';
import { ItemRarities } from '../../types/constants.js';
import { slugify } from '../../utils/helpers.util.js';
import { NotFoundError, ValidationError } from '../../utils/errors.util.js';
import { logger } from '../../middleware/logger.middleware.js';
import { skinsCache } from '../../utils/skinsCache.util.js';

const prisma = new PrismaClient();

/**
 * Маппинг ID редкости из skins-cache.json на ItemRarity enum
 * Преобразует редкости CS2 API в игровые редкости ItemRarity
 */
const mapRarityIdToEnum = (rarityId: string): ItemRarity => {
  const rarityMap: Record<string, ItemRarity> = {
    // Обычные скины (Ширпотреб)
    rarity_common_weapon: ItemRarities.CONSUMER,

    // Промышленное качество
    rarity_uncommon_weapon: ItemRarities.INDUSTRIAL,

    // Армейское качество
    rarity_rare_weapon: ItemRarities.MIL_SPEC,

    // Запрещённое
    rarity_mythical_weapon: ItemRarities.RESTRICTED,

    // Засекреченное
    rarity_legendary_weapon: ItemRarities.CLASSIFIED,

    // Элитные (древние и экстраординарные)
    rarity_ancient: ItemRarities.COVERT,
    rarity_ancient_weapon: ItemRarities.COVERT,

    // Контрабанда (тоже редкая)
    rarity_contraband_weapon: ItemRarities.COVERT,
  };

  return rarityMap[rarityId] || ItemRarities.CONSUMER; // Дефолт на CONSUMER если не найдено
};

/**
 * Получить все кейсы (включая неактивные)
 */
export const getAllCases = async (): Promise<ICaseWithItems[]> => {
  try {
    const cases = await prisma.case.findMany({
      include: {
        category: true,
        items: {
          include: { item: true },
          orderBy: { chancePercent: 'desc' },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Конвертируем Decimal в number для chancePercent, цены теперь в копейках (Int)
    const formattedCases = cases.map((caseData) => ({
      ...caseData,
      price: caseData.price,
      items: caseData.items.map((caseItem) => ({
        id: caseItem.id,
        chancePercent: caseItem.chancePercent.toNumber(),
        item: {
          ...caseItem.item,
          price: caseItem.item.price,
        },
      })),
    }));

    logger.info('Получен список всех кейсов', { count: formattedCases.length });
    return formattedCases;
  } catch (error) {
    logger.error('Ошибка получения списка кейсов', { error });
    throw error;
  }
};

/**
 * Получить кейс по ID с полной информацией
 */
export const getCaseById = async (id: string): Promise<ICaseWithItems> => {
  try {
    const caseData = await prisma.case.findUnique({
      where: { id },
      include: {
        category: true,
        items: {
          include: { item: true },
          orderBy: { chancePercent: 'desc' },
        },
      },
    });

    if (!caseData) {
      throw new NotFoundError('Кейс не найден');
    }

    // Конвертируем Decimal в number для chancePercent, цены теперь в копейках (Int)
    const formattedCase: ICaseWithItems = {
      ...caseData,
      price: caseData.price,
      items: caseData.items.map((caseItem) => ({
        id: caseItem.id,
        chancePercent: caseItem.chancePercent.toNumber(),
        item: {
          ...caseItem.item,
          price: caseItem.item.price,
        },
      })),
    };

    logger.info('Получен кейс по ID', { caseId: id });
    return formattedCase;
  } catch (error) {
    logger.error('Ошибка получения кейса по ID', { error, id });
    throw error;
  }
};

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
    return {
      ...newCase,
      price: newCase.price,
    };
  } catch (error) {
    logger.error('Ошибка создания кейса', { error, input });
    throw error;
  }
};

/**
 * Обновить кейс
 */
export const updateCase = async (id: string, input: IUpdateCaseInput): Promise<ICase> => {
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
    return {
      ...updatedCase,
      price: updatedCase.price,
    };
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
 * Автоматически создает скины на основе marketHashName
 * Извлекает полные данные (название, изображение, редкость) из skins-cache.json
 * Получает цены из market.csgo.com для новых скинов (оптимизированный батч-запрос)
 * Проверяет дубликаты и валидирует суммы шансов
 */
export const addItemsToCase = async (
  caseId: string,
  input: IAddItemsToCaseInput
): Promise<{ caseWithItems: ICaseWithItems; warnings: any[] }> => {
  try {
    // Импортируем оптимизированный сервис для получения цен (батч-запрос)
    const { fetchPricesForMultipleSkinsBatch } = await import('../marketPrice.service.js');

    // 1. Проверить существование кейса
    const existingCase = await prisma.case.findUnique({ where: { id: caseId } });
    if (!existingCase) {
      throw new NotFoundError('Кейс не найден');
    }

    // 2. Получить все уже существующие скины в кейсе
    const existingItems = await prisma.caseItem.findMany({
      where: { caseId },
      include: { item: true },
    });
    const existingMarketHashNames = new Set(existingItems.map((ci) => ci.item.marketHashName));

    // 3. Первый проход: проверить дубликаты, найти скины в БД, собрать список для получения цен
    const warnings: any[] = [];
    const skinsToProcess: Array<{
      marketHashName: string;
      chancePercent: number;
      item?: any; // Если скин уже есть в БД
      cachedSkin?: any; // Данные из кеша (если нужно создать)
      needsPrice: boolean; // Нужно ли получить цену
    }> = [];

    for (const inputItem of input.items) {
      const marketHashName = inputItem.marketHashName;

      // Проверка дубликата ДО обработки
      if (existingMarketHashNames.has(marketHashName)) {
        warnings.push({
          skinName: marketHashName,
          error: 'Этот скин уже добавлен в кейс',
          type: 'DUPLICATE',
        });
        continue;
      }

      // Попробовать найти скин в БД
      const item = await prisma.item.findUnique({
        where: { marketHashName },
      });

      if (item) {
        // Скин уже есть в БД, цена не нужна
        skinsToProcess.push({
          marketHashName,
          chancePercent: inputItem.chancePercent,
          item,
          needsPrice: false,
        });
      } else {
        // Скина нет в БД, нужно получить данные из кеша и цену
        const cachedSkin = skinsCache.findByHashName(marketHashName);

        if (!cachedSkin) {
          warnings.push({
            skinName: marketHashName,
            error: 'Скин не найден ни в базе, ни в кэше скинов',
            type: 'NOT_FOUND',
          });
          continue;
        }

        skinsToProcess.push({
          marketHashName,
          chancePercent: inputItem.chancePercent,
          cachedSkin,
          needsPrice: true,
        });
      }

      existingMarketHashNames.add(marketHashName);
    }

    // 4. Получить цены для всех скинов, которых нет в БД (ОДИН батч-запрос!)
    const skinsNeedingPrices = skinsToProcess.filter((s) => s.needsPrice);
    const pricesMap = new Map<string, any>();

    if (skinsNeedingPrices.length > 0) {
      const marketHashNames = skinsNeedingPrices.map((s) => s.marketHashName);
      logger.info('Получение цен для новых скинов (оптимизированный батч-запрос)', {
        count: marketHashNames.length,
      });

      const fetchedPrices = await fetchPricesForMultipleSkinsBatch(marketHashNames);

      // Сохранить цены в Map для быстрого доступа
      for (const [name, result] of fetchedPrices) {
        pricesMap.set(name, result);
      }
    }

    // 5. Второй проход: создать скины в БД для тех, у кого есть цены
    const itemsToCreate: Array<{
      itemId: string;
      chancePercent: number;
    }> = [];

    for (const skinData of skinsToProcess) {
      if (!skinData.needsPrice) {
        // Скин уже есть в БД
        itemsToCreate.push({
          itemId: skinData.item.id,
          chancePercent: skinData.chancePercent,
        });
      } else {
        // Нужно создать скин в БД
        const priceResult = pricesMap.get(skinData.marketHashName);

        if (!priceResult || !priceResult.success) {
          warnings.push({
            skinName: skinData.marketHashName,
            error: priceResult?.error || 'Не удалось получить цену',
            type: 'PRICE_ERROR',
          });
          continue;
        }

        // Создать новый скин со всеми полными данными из кеша
        try {
          const item = await prisma.item.create({
            data: {
              marketHashName: skinData.cachedSkin.market_hash_name,
              displayName: skinData.cachedSkin.name,
              weaponName: skinData.cachedSkin.weapon.name,
              skinName: skinData.cachedSkin.pattern.name,
              categoryName: skinData.cachedSkin.category.name,
              quality: skinData.cachedSkin.wear.name,
              imageUrl: skinData.cachedSkin.image,
              price: priceResult.price!,
              rarity: mapRarityIdToEnum(skinData.cachedSkin.rarity.id),
            },
          });

          logger.info('Новый скин создан из кеша с полными данными', item);

          itemsToCreate.push({
            itemId: item.id,
            chancePercent: skinData.chancePercent,
          });
        } catch (createError) {
          logger.error('Ошибка создания скина', {
            error: createError,
            marketHashName: skinData.marketHashName,
          });

          warnings.push({
            skinName: skinData.marketHashName,
            error: 'Ошибка создания скина в базе',
            type: 'VALIDATION_ERROR',
          });
        }
      }
    }

    // 6. Если нечего добавлять - вернуть ошибку
    if (itemsToCreate.length === 0) {
      throw new ValidationError(
        `Не удалось добавить ни один скин. Ошибки: ${warnings.map((w) => w.error).join(', ')}`
      );
    }

    // 5. Добавить предметы в кейс (в транзакции)
    await prisma.$transaction(
      itemsToCreate.map((item) =>
        prisma.caseItem.create({
          data: {
            caseId,
            itemId: item.itemId,
            chancePercent: item.chancePercent,
          },
        })
      )
    );

    // 6. Вернуть кейс с предметами
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
      successful: itemsToCreate.length,
      failed: warnings.length,
    });

    if (!caseWithItems) {
      throw new NotFoundError('Кейс не найден');
    }

    const formattedCase: ICaseWithItems = {
      ...caseWithItems,
      price: caseWithItems.price,
      items: caseWithItems.items.map((caseItem) => ({
        id: caseItem.id,
        chancePercent: caseItem.chancePercent.toNumber(),
        item: {
          ...caseItem.item,
          price: caseItem.item.price,
        },
      })),
    };

    return { caseWithItems: formattedCase, warnings };
  } catch (error) {
    logger.error('Ошибка добавления предметов в кейс', { error, caseId, input });
    throw error;
  }
};
