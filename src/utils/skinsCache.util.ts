import fs from 'fs';
import path from 'path';
import { logger } from '../middleware/logger.middleware.js';
import { config } from '@/config/env.config.js';

/**
 * Типы для skins-cache.json
 */
export interface CachedSkin {
  id: string;
  skin_id: string;
  name: string;
  description: string;
  weapon: {
    id: string;
    weapon_id: number;
    name: string;
  };
  category: {
    id: string;
    name: string;
  };
  pattern: {
    id: string;
    name: string;
  };
  min_float: number;
  max_float: number;
  wear: {
    id: string;
    name: string;
  };
  stattrak: boolean;
  souvenir: boolean;
  paint_index: string;
  rarity: {
    id: string;
    name: string;
    color: string;
  };
  market_hash_name: string;
  team: {
    id: string;
    name: string;
  };
  style: {
    id: number;
    name: string;
    url: string | null;
  };
  legacy_model: boolean;
  image: string;
  original: {
    name: string;
    image_inventory: string;
  };
}

interface SkinsCacheData {
  lastSync: string;
  totalSkins: number;
  skins: CachedSkin[];
}

/**
 * Утилита для работы с кешем скинов
 * Индексирует скины для быстрого поиска по разным параметрам
 */
class SkinsCacheIndex {
  private skins: CachedSkin[] = [];
  private cacheFilePath: string;

  // Индексы для быстрого поиска
  private indexByHashName: Map<string, CachedSkin> = new Map();
  private indexByRarity: Map<string, CachedSkin[]> = new Map();
  private indexByWeapon: Map<string, CachedSkin[]> = new Map();
  private indexById: Map<string, CachedSkin> = new Map();

  constructor() {
    // process.cwd() возвращает папку server (так как npm run dev выполняется из server/)
    // Поэтому нам нужен только path relative от server/
    this.cacheFilePath = path.join(process.cwd(), 'data', config.cacheFile);
  }

  /**
   * Загрузить кеш при старте сервера
   */
  async load(): Promise<void> {
    try {
      logger.info('Загрузка кеша скинов...', { path: this.cacheFilePath, cwd: process.cwd() });

      if (!fs.existsSync(this.cacheFilePath)) {
        logger.error('Файл кеша скинов не найден', {
          path: this.cacheFilePath,
          cwd: process.cwd(),
          fileExists: false,
        });
        return;
      }

      const fileContent = fs.readFileSync(this.cacheFilePath, 'utf-8');
      const data = JSON.parse(fileContent) as SkinsCacheData;
      this.skins = data.skins;

      if (!this.skins || this.skins.length === 0) {
        logger.warn('Кеш скинов пуст или не содержит данных', {
          path: this.cacheFilePath,
          skinsCount: this.skins?.length || 0,
        });
        return;
      }

      // Создать индексы
      this.buildIndexes();

      logger.info('✅ Кеш скинов загружен успешно', {
        path: this.cacheFilePath,
        totalSkins: this.skins.length,
        hashNameIndex: this.indexByHashName.size,
        rarityIndex: this.indexByRarity.size,
        weaponIndex: this.indexByWeapon.size,
      });
    } catch (error) {
      logger.error('❌ Ошибка при загрузке кеша скинов', {
        error: error instanceof Error ? error.message : String(error),
        path: this.cacheFilePath,
      });
      throw error;
    }
  }

  /**
   * Перезагрузить кеш (вызывается при синхронизации в 03:00)
   */
  async reload(): Promise<void> {
    logger.info('Перезагрузка кеша скинов');
    this.indexByHashName.clear();
    this.indexByRarity.clear();
    this.indexByWeapon.clear();
    this.indexById.clear();
    this.skins = [];
    await this.load();
  }

  /**
   * Построить все индексы
   */
  private buildIndexes(): void {
    for (const skin of this.skins) {
      // Индекс по market_hash_name
      this.indexByHashName.set(skin.market_hash_name, skin);

      // Индекс по ID
      this.indexById.set(skin.id, skin);

      // Индекс по редкости
      const rarityId = skin.rarity.id;
      if (!this.indexByRarity.has(rarityId)) {
        this.indexByRarity.set(rarityId, []);
      }
      this.indexByRarity.get(rarityId)!.push(skin);

      // Индекс по оружию
      const weaponId = skin.weapon.id;
      if (!this.indexByWeapon.has(weaponId)) {
        this.indexByWeapon.set(weaponId, []);
      }
      this.indexByWeapon.get(weaponId)!.push(skin);
    }
  }

  /**
   * Найти скин по market_hash_name (для добавления в кейс)
   */
  findByHashName(hashName: string): CachedSkin | undefined {
    const skin = this.indexByHashName.get(hashName);

    if (!skin) {
      logger.debug('Скин не найден в кэше', {
        searching: hashName,
        totalSkinsInCache: this.skins.length,
        indexSize: this.indexByHashName.size,
        firstFewHashNames: Array.from(this.indexByHashName.keys()).slice(0, 3),
      });
    }

    return skin;
  }

  /**
   * Найти скин по ID
   */
  findById(id: string): CachedSkin | undefined {
    return this.indexById.get(id);
  }

  /**
   * Найти все скины определённой редкости
   */
  findByRarity(rarityId: string): CachedSkin[] {
    return this.indexByRarity.get(rarityId) || [];
  }

  /**
   * Найти все скины определённого оружия
   */
  findByWeapon(weaponId: string): CachedSkin[] {
    return this.indexByWeapon.get(weaponId) || [];
  }

  /**
   * Поиск с несколькими параметрами фильтрации
   */
  search(filters: {
    query?: string; // Поиск по имени или market_hash_name
    rarity?: string; // rarity.id
    weapon?: string; // weapon.id
    limit?: number; // Лимит результатов
  }): CachedSkin[] {
    let results = this.skins;

    // Фильтр по редкости
    if (filters.rarity) {
      const byRarity = this.indexByRarity.get(filters.rarity) || [];
      results = results.filter((s) => byRarity.includes(s));
    }

    // Фильтр по оружию
    if (filters.weapon) {
      const byWeapon = this.indexByWeapon.get(filters.weapon) || [];
      results = results.filter((s) => byWeapon.includes(s));
    }

    // Поиск по тексту (имя или market_hash_name)
    if (filters.query) {
      const query = filters.query.toLowerCase();
      results = results.filter(
        (s) =>
          s.name.toLowerCase().includes(query) || s.market_hash_name.toLowerCase().includes(query)
      );
    }

    // Применить лимит
    if (filters.limit) {
      results = results.slice(0, filters.limit);
    }

    return results;
  }

  /**
   * Получить все уникальные редкости
   */
  getAllRarities(): Array<{ id: string; name: string; color: string }> {
    const rarities = new Map<string, CachedSkin>();

    for (const skin of this.skins) {
      if (!rarities.has(skin.rarity.id)) {
        rarities.set(skin.rarity.id, skin);
      }
    }

    return Array.from(rarities.values()).map((s) => ({
      id: s.rarity.id,
      name: s.rarity.name,
      color: s.rarity.color,
    }));
  }

  /**
   * Получить все уникальные оружия
   */
  getAllWeapons(): Array<{ id: string; name: string }> {
    const weapons = new Map<string, CachedSkin>();

    for (const skin of this.skins) {
      if (!weapons.has(skin.weapon.id)) {
        weapons.set(skin.weapon.id, skin);
      }
    }

    return Array.from(weapons.values()).map((s) => ({
      id: s.weapon.id,
      name: s.weapon.name,
    }));
  }

  /**
   * Получить статистику кеша
   */
  getStats() {
    return {
      totalSkins: this.skins.length,
      rarities: this.indexByRarity.size,
      weapons: this.indexByWeapon.size,
    };
  }
}

// Экспортируем singleton
export const skinsCache = new SkinsCacheIndex();
