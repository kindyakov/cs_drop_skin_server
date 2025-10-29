import { skinsCache, CachedSkin } from '../../utils/skinsCache.util.js';
import { csApiService, SyncResult } from '../csApi.service.js';
import { logger } from '../../middleware/logger.middleware.js';

/**
 * Интерфейс для фильтров скинов
 */
export interface SkinFilters {
  // Поиск
  search?: string; // Поиск по name или market_hash_name (регистронезависимый)

  // Фильтры по полям
  weaponId?: string; // Точное совпадение weapon.id
  categoryId?: string; // Точное совпадение category.id
  rarityId?: string; // Точное совпадение rarity.id
  patternId?: string; // Точное совпадение pattern.id
  wearId?: string; // Точное совпадение wear.id
  stattrak?: boolean; // Фильтр по StatTrak
  souvenir?: boolean; // Фильтр по Souvenir

  // Пагинация
  page?: number; // default: 1
  limit?: number; // default: 50, max: 500

  // Сортировка
  sortBy?: 'name' | 'rarity' | 'weapon' | 'category'; // default: 'name'
  sortOrder?: 'asc' | 'desc'; // default: 'asc'
}

/**
 * Интерфейс для результата фильтрации скинов
 */
export interface FilteredSkinsResult {
  skins: CachedSkin[]; // Отфильтрованные скины с пагинацией
  pagination: {
    total: number; // Общее количество после фильтров
    page: number; // Текущая страница
    limit: number; // Лимит на странице
    totalPages: number; // Всего страниц
  };
}

/**
 * Интерфейс для доступных фильтров
 */
export interface AvailableFilters {
  weapons: Array<{ id: string; name: string }>; // Уникальные оружия
  categories: Array<{ id: string; name: string }>; // Уникальные категории
  rarities: Array<{
    // Уникальные редкости
    id: string;
    name: string;
    color: string;
  }>;
  patterns: Array<{ id: string; name: string }>; // Уникальные паттерны
  wears: Array<{ id: string; name: string }>; // Уникальные износы
}

/**
 * Интерфейс для статистики скинов
 */
export interface SkinsStats {
  totalSkins: number;
  totalWeapons: number;
  totalCategories: number;
  totalRarities: number;
  totalPatterns: number;
  totalWears: number;
  stattrakCount: number;
  souvenirCount: number;
}

/**
 * Сервис для работы со скинами в админке
 * Использует кэш в памяти для высокопроизводительной фильтрации
 */
class AdminSkinsService {
  /**
   * Получить все скины из кэша
   * @private
   */
  private getAllSkins(): CachedSkin[] {
    const cacheStats = skinsCache.getStats();

    // Проверяем, что кэш загружен
    if (cacheStats.totalSkins === 0) {
      logger.warn('Кэш скинов пуст. Возможно, кэш еще не загружен или файл поврежден');
      return [];
    }

    return skinsCache.search({});
  }

  /**
   * Фильтрация скинов с пагинацией
   * @param filters Параметры фильтрации
   * @returns Отфильтрованные скины с пагинацией
   */
  public getFilteredSkins(filters: SkinFilters): FilteredSkinsResult {
    logger.debug('Начало фильтрации скинов', { filters });

    const allSkins = this.getAllSkins();
    if (allSkins.length === 0) {
      logger.warn('Не удалось получить скины для фильтрации. Кэш пуст.');
      return {
        skins: [],
        pagination: {
          total: 0,
          page: filters.page || 1,
          limit: filters.limit || 50,
          totalPages: 0,
        },
      };
    }

    // Базовая фильтрация через skinsCache.search()
    let filtered = allSkins;

    // Применяем дополнительные фильтры
    if (filters.search) {
      const query = filters.search.toLowerCase();
      filtered = filtered.filter(
        (s) =>
          s.name.toLowerCase().includes(query) || s.market_hash_name.toLowerCase().includes(query)
      );
    }

    if (filters.categoryId) {
      filtered = filtered.filter((skin) => skin.category.id === filters.categoryId);
    }

    if (filters.patternId) {
      filtered = filtered.filter((skin) => skin.pattern.id === filters.patternId);
    }

    if (filters.wearId) {
      filtered = filtered.filter((skin) => skin.wear.id === filters.wearId);
    }

    if (filters.stattrak !== undefined) {
      filtered = filtered.filter((skin) => skin.stattrak === filters.stattrak);
    }

    if (filters.souvenir !== undefined) {
      filtered = filtered.filter((skin) => skin.souvenir === filters.souvenir);
    }

    // Сортировка
    const sortBy = filters.sortBy || 'name';
    const sortOrder = filters.sortOrder || 'asc';

    filtered.sort((a, b) => {
      let aValue: string;
      let bValue: string;

      switch (sortBy) {
        case 'rarity':
          aValue = a.rarity.name;
          bValue = b.rarity.name;
          break;
        case 'weapon':
          aValue = a.weapon.name;
          bValue = b.weapon.name;
          break;
        case 'category':
          aValue = a.category.name;
          bValue = b.category.name;
          break;
        case 'name':
        default:
          aValue = a.name;
          bValue = b.name;
          break;
      }

      const comparison = aValue.localeCompare(bValue);
      return sortOrder === 'desc' ? -comparison : comparison;
    });

    // Пагинация
    const page = Math.max(1, filters.page || 1);
    const limit = Math.min(500, Math.max(1, filters.limit || 50));

    const total = filtered.length;
    const totalPages = Math.ceil(total / limit);
    const skip = (page - 1) * limit;

    const paginatedSkins = filtered.slice(skip, skip + limit);

    const result = {
      skins: paginatedSkins,
      pagination: {
        total,
        page,
        limit,
        totalPages,
      },
    };

    logger.debug('Фильтрация скинов завершена', {
      total,
      page,
      limit,
      found: paginatedSkins.length,
    });

    return result;
  }

  /**
   * Получить скин по ID
   * @param id ID скина
   * @returns Найденный скин или null
   */
  public getSkinById(id: string): CachedSkin | null {
    try {
      const skin = skinsCache.findById(id);
      return skin || null;
    } catch (error) {
      logger.error('Ошибка при получении скина по ID', { error, id });
      return null;
    }
  }

  /**
   * Получить доступные фильтры
   * @returns Списки уникальных значений для фильтров
   */
  public getAvailableFilters(): AvailableFilters {
    try {
      const allSkins = this.getAllSkins();

      if (allSkins.length === 0) {
        logger.warn('Кэш скинов пуст при запросе фильтров. Возможно, кэш еще не загружен или пуст');
        return {
          weapons: [],
          categories: [],
          rarities: [],
          patterns: [],
          wears: [],
        };
      }

      // Оружия и редкости из skinsCache
      const weapons = skinsCache.getAllWeapons().sort((a, b) => a.name.localeCompare(b.name));

      const rarities = skinsCache.getAllRarities().sort((a, b) => a.name.localeCompare(b.name));

      // Категории, паттерны, износы - собираем вручную
      // Уникальные категории
      const categoriesMap = new Map<string, { id: string; name: string }>();
      allSkins.forEach((skin) => {
        if (skin.category?.id && !categoriesMap.has(skin.category.id)) {
          categoriesMap.set(skin.category.id, {
            id: skin.category.id,
            name: skin.category.name,
          });
        }
      });
      const categories = Array.from(categoriesMap.values()).sort((a, b) =>
        a.name.localeCompare(b.name)
      );

      // Уникальные паттерны
      const patternsMap = new Map<string, { id: string; name: string }>();
      allSkins.forEach((skin) => {
        if (skin.pattern?.id && !patternsMap.has(skin.pattern.id)) {
          patternsMap.set(skin.pattern.id, {
            id: skin.pattern.id,
            name: skin.pattern.name,
          });
        }
      });
      const patterns = Array.from(patternsMap.values()).sort((a, b) =>
        a.name.localeCompare(b.name)
      );

      // Уникальные износы
      const wearsMap = new Map<string, { id: string; name: string }>();
      allSkins.forEach((skin) => {
        if (skin.wear?.id && !wearsMap.has(skin.wear.id)) {
          wearsMap.set(skin.wear.id, {
            id: skin.wear.id,
            name: skin.wear.name,
          });
        }
      });
      const wears = Array.from(wearsMap.values()).sort((a, b) => a.name.localeCompare(b.name));

      return {
        weapons,
        categories,
        rarities,
        patterns,
        wears,
      };
    } catch (error) {
      console.log(error);
      logger.error('Ошибка при получении доступных фильтров', {
        error: error instanceof Error ? error.message : String(error),
      });
      return {
        weapons: [],
        categories: [],
        rarities: [],
        patterns: [],
        wears: [],
      };
    }
  }

  /**
   * Получить статистику по скинам
   * @returns Общая статистика по скинам в кэше
   */
  public getSkinsStats(): SkinsStats {
    try {
      // Базовая статистика из skinsCache
      const cacheStats = skinsCache.getStats();

      console.log(cacheStats);

      if (cacheStats.totalSkins === 0) {
        logger.warn(
          'Кэш скинов пуст при запросе статистики. Возможно, кэш еще не загружен или пуст'
        );
        return {
          totalSkins: 0,
          totalWeapons: 0,
          totalCategories: 0,
          totalRarities: 0,
          totalPatterns: 0,
          totalWears: 0,
          stattrakCount: 0,
          souvenirCount: 0,
        };
      }

      // Получаем все скины для дополнительной статистики
      const allSkins = this.getAllSkins();

      // Уникальные категории
      const categoriesSet = new Set<string>();
      allSkins.forEach((skin) => skin.category?.id && categoriesSet.add(skin.category.id));

      // Уникальные паттерны
      const patternsSet = new Set<string>();
      allSkins.forEach((skin) => skin.pattern?.id && patternsSet.add(skin.pattern.id));

      // Уникальные износы
      const wearsSet = new Set<string>();
      allSkins.forEach((skin) => skin.wear?.id && wearsSet.add(skin.wear.id));

      // StatTrak и Souvenir
      let stattrakCount = 0;
      let souvenirCount = 0;
      allSkins.forEach((skin) => {
        if (skin.stattrak) stattrakCount++;
        if (skin.souvenir) souvenirCount++;
      });

      return {
        totalSkins: cacheStats.totalSkins,
        totalWeapons: cacheStats.weapons,
        totalCategories: categoriesSet.size,
        totalRarities: cacheStats.rarities,
        totalPatterns: patternsSet.size,
        totalWears: wearsSet.size,
        stattrakCount,
        souvenirCount,
      };
    } catch (error) {
      logger.error('Ошибка при получении статистики скинов', { error });
      return {
        totalSkins: 0,
        totalWeapons: 0,
        totalCategories: 0,
        totalRarities: 0,
        totalPatterns: 0,
        totalWears: 0,
        stattrakCount: 0,
        souvenirCount: 0,
      };
    }
  }

  /**
   * Синхронизация с API и перезагрузка кэша
   * @returns Результат синхронизации
   */
  public async syncSkinsFromApi(): Promise<SyncResult> {
    logger.info('Запуск синхронизации скинов из Admin Skins Service');

    try {
      const result = await csApiService.syncSkinsCache();

      logger.info('Перезагрузка кэша скинов после синхронизации');
      await skinsCache.reload();

      return result;
    } catch (error) {
      logger.error('Ошибка при синхронизации скинов', { error });
      throw error;
    }
  }
}

// Экспортируем singleton инстанс
export const adminSkinsService = new AdminSkinsService();
