import { prisma } from '../config/database.js';
import { ItemRarity } from '@prisma/client';
import { logger } from '../middleware/logger.middleware.js';
import { skinsCache } from '../utils/skinsCache.util.js';
import { fetchPricesForMultipleSkinsBatch } from './marketPrice.service.js';
import {
  ICalculateProbabilitiesInput,
  ICalculateProbabilitiesOutput,
  ICalculatedSkinProbability,
  ISkinDataForCalculation,
  DEFAULT_RARITY_CHANCES,
} from '../types/probability.types.js';
import { IAddItemError } from '../types/admin.types.js';

/**
 * Маппинг ID редкости из кеша скинов в Prisma enum
 */
const RARITY_ID_TO_ENUM_MAP: Record<string, ItemRarity> = {
  rarity_consumer: 'CONSUMER',
  rarity_common: 'CONSUMER', // Альтернативное название
  rarity_industrial: 'INDUSTRIAL',
  rarity_uncommon: 'INDUSTRIAL', // Альтернативное название
  rarity_milspec: 'MIL_SPEC',
  rarity_rare: 'MIL_SPEC', // Альтернативное название
  rarity_restricted: 'RESTRICTED',
  rarity_mythical: 'RESTRICTED', // Альтернативное название
  rarity_classified: 'CLASSIFIED',
  rarity_legendary: 'CLASSIFIED', // Альтернативное название
  rarity_covert: 'COVERT',
  rarity_ancient: 'COVERT', // Альтернативное название
  rarity_contraband: 'CONTRABAND',
};

/**
 * Маппинг ID редкости в enum
 */
function mapRarityIdToEnum(rarityId: string): ItemRarity {
  const mapped = RARITY_ID_TO_ENUM_MAP[rarityId.toLowerCase()];
  if (!mapped) {
    logger.warn('Неизвестный rarity ID, используем CONSUMER по умолчанию', { rarityId });
    return 'CONSUMER';
  }
  return mapped;
}

/**
 * Сервис для расчета вероятностей выпадения скинов
 * Поддерживает 3 алгоритма: price, rarity, combined
 */

/**
 * Главная функция расчета вероятностей
 * @param input Входные данные (marketHashNames, algorithm, options)
 * @returns Рассчитанные вероятности для каждого скина + предупреждения
 */
export const calculateProbabilities = async (
  input: ICalculateProbabilitiesInput
): Promise<ICalculateProbabilitiesOutput> => {
  const { marketHashNames, algorithm, options } = input;
  const warnings: IAddItemError[] = [];
  const skinsData: ISkinDataForCalculation[] = [];

  logger.info('Начало расчета вероятностей', {
    totalSkins: marketHashNames.length,
    algorithm,
    options,
  });

  // ШАГ 1: Получить данные скинов из БД и кеша
  const skinsDataResult = await getSkinDataWithPrices(marketHashNames);
  skinsData.push(...skinsDataResult.skinsData);
  warnings.push(...skinsDataResult.warnings);

  if (skinsData.length === 0) {
    logger.warn('Не найдено ни одного скина для расчета вероятностей');
    return {
      items: [],
      totalChance: 0,
      algorithm,
      warnings,
    };
  }

  // ШАГ 2: Рассчитать вероятности в зависимости от алгоритма
  let calculatedItems: ICalculatedSkinProbability[] = [];

  switch (algorithm) {
    case 'price':
      calculatedItems = calculateProbabilitiesByPrice(skinsData, options);
      break;
    case 'rarity':
      calculatedItems = calculateProbabilitiesByRarity(skinsData, options);
      break;
    case 'combined':
      calculatedItems = calculateProbabilitiesCombined(skinsData, options);
      break;
    default:
      logger.error('Неизвестный алгоритм расчета', { algorithm });
      throw new Error(`Неизвестный алгоритм: ${algorithm}`);
  }

  // ШАГ 3: Подсчитать общую сумму вероятностей
  const totalChance = calculatedItems.reduce((sum, item) => sum + item.calculatedChance, 0);

  logger.info('Расчет вероятностей завершен', {
    algorithm,
    totalItems: calculatedItems.length,
    totalChance: totalChance.toFixed(2),
    warnings: warnings.length,
  });

  return {
    items: calculatedItems,
    totalChance: parseFloat(totalChance.toFixed(2)),
    algorithm,
    warnings: warnings.length > 0 ? warnings : undefined,
  };
};

/**
 * Получить данные скинов (из БД или кеша) + цены из API
 * @param marketHashNames Список названий скинов
 * @returns Данные скинов + предупреждения
 */
async function getSkinDataWithPrices(marketHashNames: string[]): Promise<{
  skinsData: ISkinDataForCalculation[];
  warnings: IAddItemError[];
}> {
  const skinsData: ISkinDataForCalculation[] = [];
  const warnings: IAddItemError[] = [];
  const skinsNeedingPrices: string[] = [];

  // ШАГ 1: Проверить, какие скины уже есть в БД
  for (const marketHashName of marketHashNames) {
    // Попробовать найти в БД
    const existingItem = await prisma.item.findUnique({
      where: { marketHashName },
    });

    if (existingItem) {
      // Скин есть в БД - используем существующие данные
      skinsData.push({
        marketHashName: existingItem.marketHashName,
        displayName: existingItem.displayName,
        weaponName: existingItem.weaponName || '',
        skinName: existingItem.skinName || '',
        quality: existingItem.quality || '',
        price: existingItem.price,
        rarity: existingItem.rarity,
        imageUrl: existingItem.imageUrl,
        existsInDatabase: true,
      });
    } else {
      // Скина нет в БД - проверить в кеше
      const cachedSkin = skinsCache.findByHashName(marketHashName);

      if (!cachedSkin) {
        warnings.push({
          skinName: marketHashName,
          error: 'Скин не найден ни в базе данных, ни в кеше скинов',
          type: 'NOT_FOUND',
        });
        continue;
      }

      // Скин найден в кеше - нужно получить цену
      skinsNeedingPrices.push(marketHashName);
    }
  }

  // ШАГ 2: Получить цены для новых скинов батч-запросом
  if (skinsNeedingPrices.length > 0) {
    logger.info('Получение цен для новых скинов', {
      count: skinsNeedingPrices.length,
    });

    const pricesMap = await fetchPricesForMultipleSkinsBatch(skinsNeedingPrices);

    for (const marketHashName of skinsNeedingPrices) {
      const cachedSkin = skinsCache.findByHashName(marketHashName)!; // Уже проверили выше
      const priceResult = pricesMap.get(marketHashName);

      if (!priceResult || !priceResult.success || !priceResult.price) {
        warnings.push({
          skinName: marketHashName,
          error: priceResult?.error || 'Не удалось получить цену из market.csgo.com',
          type: 'PRICE_ERROR',
        });
        continue;
      }

      // Добавить скин с полученной ценой
      skinsData.push({
        marketHashName: cachedSkin.market_hash_name,
        displayName: cachedSkin.name,
        weaponName: cachedSkin.weapon.name,
        skinName: cachedSkin.pattern.name,
        quality: cachedSkin.wear.name,
        price: priceResult.price,
        rarity: mapRarityIdToEnum(cachedSkin.rarity.id),
        imageUrl: cachedSkin.image,
        existsInDatabase: false,
      });
    }
  }

  logger.info('Получение данных скинов завершено', {
    totalRequested: marketHashNames.length,
    foundInDB: skinsData.filter((s) => s.existsInDatabase).length,
    fetchedFromAPI: skinsData.filter((s) => !s.existsInDatabase).length,
    warnings: warnings.length,
  });

  return { skinsData, warnings };
}

/**
 * Алгоритм 1: Расчет вероятностей на основе ЦЕНЫ (обратная пропорция)
 * Дорогой скин = низкая вероятность, дешевый скин = высокая вероятность
 *
 * Формула:
 * 1. Для каждого скина: weight = 1 / price
 * 2. Сумма всех весов: totalWeight = Σ weights
 * 3. Вероятность: chancePercent = (weight / totalWeight) × 100
 *
 * @param skinsData Данные скинов с ценами
 * @param options Опции (minChance, maxChance)
 * @returns Скины с рассчитанными вероятностями
 */
function calculateProbabilitiesByPrice(
  skinsData: ISkinDataForCalculation[],
  options?: { minChance?: number; maxChance?: number }
): ICalculatedSkinProbability[] {
  const minChance = options?.minChance ?? 0.1;
  const maxChance = options?.maxChance ?? 50;

  // Шаг 1: Рассчитать веса (обратная пропорция цены)
  const weights = skinsData.map((skin) => ({
    skin,
    weight: 1 / skin.price,
  }));

  const totalWeight = weights.reduce((sum, w) => sum + w.weight, 0);

  // Шаг 2: Рассчитать вероятности
  const probabilities = weights.map(({ skin, weight }) => {
    let chance = (weight / totalWeight) * 100;

    // Применить ограничения
    chance = Math.max(minChance, Math.min(maxChance, chance));

    return {
      ...skin,
      calculatedChance: parseFloat(chance.toFixed(2)),
    };
  });

  // Шаг 3: Нормализовать до 100%
  return normalizeProbabilities(probabilities);
}

/**
 * Алгоритм 2: Расчет вероятностей на основе РЕДКОСТИ
 * Каждой редкости присваивается фиксированный базовый шанс
 * Скины внутри одной редкости имеют одинаковый шанс
 *
 * @param skinsData Данные скинов
 * @param options Опции (minChance, maxChance)
 * @returns Скины с рассчитанными вероятностями
 */
function calculateProbabilitiesByRarity(
  skinsData: ISkinDataForCalculation[],
  options?: { minChance?: number; maxChance?: number }
): ICalculatedSkinProbability[] {
  const minChance = options?.minChance ?? 0.1;
  const maxChance = options?.maxChance ?? 50;

  // Группировать скины по редкости
  const skinsByRarity = new Map<ItemRarity, ISkinDataForCalculation[]>();

  for (const skin of skinsData) {
    if (!skinsByRarity.has(skin.rarity)) {
      skinsByRarity.set(skin.rarity, []);
    }
    skinsByRarity.get(skin.rarity)!.push(skin);
  }

  const probabilities: ICalculatedSkinProbability[] = [];

  // Для каждой редкости
  for (const [rarity, skins] of skinsByRarity.entries()) {
    // Получить базовый шанс для этой редкости
    const rarityBaseChance = DEFAULT_RARITY_CHANCES[rarity] || 10; // Fallback 10%

    // Разделить базовый шанс поровну между скинами этой редкости
    let chancePerSkin = rarityBaseChance / skins.length;

    // Применить ограничения
    chancePerSkin = Math.max(minChance, Math.min(maxChance, chancePerSkin));

    for (const skin of skins) {
      probabilities.push({
        ...skin,
        calculatedChance: parseFloat(chancePerSkin.toFixed(2)),
      });
    }
  }

  // Нормализовать до 100%
  return normalizeProbabilities(probabilities);
}

/**
 * Алгоритм 3: КОМБИНИРОВАННЫЙ (редкость + цена)
 * 1. Определяем базовый шанс по редкости
 * 2. Внутри каждого тира редкости распределяем по цене (обратная пропорция)
 * 3. Нормализуем до 100%
 *
 * Пример:
 * - COVERT тир имеет базовый шанс 10%
 * - Внутри COVERT 2 скина: AWP (дорогой) и AK-47 (дешевый)
 * - AWP получит меньшую долю от 10%, AK-47 - большую
 *
 * @param skinsData Данные скинов
 * @param options Опции (minChance, maxChance)
 * @returns Скины с рассчитанными вероятностями
 */
function calculateProbabilitiesCombined(
  skinsData: ISkinDataForCalculation[],
  options?: { minChance?: number; maxChance?: number }
): ICalculatedSkinProbability[] {
  const minChance = options?.minChance ?? 0.1;
  const maxChance = options?.maxChance ?? 50;

  // Группировать скины по редкости
  const skinsByRarity = new Map<ItemRarity, ISkinDataForCalculation[]>();

  for (const skin of skinsData) {
    if (!skinsByRarity.has(skin.rarity)) {
      skinsByRarity.set(skin.rarity, []);
    }
    skinsByRarity.get(skin.rarity)!.push(skin);
  }

  const probabilities: ICalculatedSkinProbability[] = [];

  // Для каждой редкости
  for (const [rarity, skins] of skinsByRarity.entries()) {
    // Получить базовый шанс для этой редкости
    const rarityBaseChance = DEFAULT_RARITY_CHANCES[rarity] || 10;

    // Внутри этого тира распределить по цене (обратная пропорция)
    const weights = skins.map((skin) => ({
      skin,
      weight: 1 / skin.price,
    }));

    const totalWeight = weights.reduce((sum, w) => sum + w.weight, 0);

    for (const { skin, weight } of weights) {
      // Доля скина от базового шанса редкости
      let chance = (weight / totalWeight) * rarityBaseChance;

      // Применить ограничения
      chance = Math.max(minChance, Math.min(maxChance, chance));

      probabilities.push({
        ...skin,
        calculatedChance: parseFloat(chance.toFixed(2)),
      });
    }
  }

  // Нормализовать до 100%
  return normalizeProbabilities(probabilities);
}

/**
 * Нормализация вероятностей до 100%
 * Если сумма не равна 100%, пропорционально масштабирует все вероятности
 *
 * @param probabilities Скины с рассчитанными вероятностями
 * @returns Нормализованные вероятности (сумма = 100%)
 */
function normalizeProbabilities(
  probabilities: ICalculatedSkinProbability[]
): ICalculatedSkinProbability[] {
  const currentTotal = probabilities.reduce((sum, p) => sum + p.calculatedChance, 0);

  // Если сумма уже близка к 100%, не нормализуем
  if (Math.abs(currentTotal - 100) < 0.1) {
    return probabilities;
  }

  // Масштабирующий коэффициент
  const scaleFactor = 100 / currentTotal;

  logger.debug('Нормализация вероятностей', {
    currentTotal: currentTotal.toFixed(2),
    scaleFactor: scaleFactor.toFixed(4),
  });

  return probabilities.map((p) => ({
    ...p,
    calculatedChance: parseFloat((p.calculatedChance * scaleFactor).toFixed(2)),
  }));
}
