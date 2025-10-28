import axios from 'axios';
import { promises as fs } from 'fs';
import path from 'path';
import { logger } from '../middleware/logger.middleware.js';

/**
 * Интерфейс для данных скина из CSGO-API
 */
export interface CSApiSkin {
  id: string;
  name: string;
  description: string;
  weapon: {
    id: string;
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
  rarity: {
    id: string;
    name: string;
    color: string;
  };
  stattrak: boolean;
  souvenir: boolean;
  paint_index: string;
  market_hash_name: string;
  image: string;
}

/**
 * Интерфейс для структуры кэша скинов
 */
export interface SkinsCacheData {
  lastSync: string;
  totalSkins: number;
  skins: CSApiSkin[];
}

/**
 * Интерфейс для результата синхронизации
 */
export interface SyncResult {
  lastSync: string;
  totalSkins: number;
  duration: number;
}

/**
 * Интерфейс для информации о кэше
 */
export interface CacheInfo {
  lastSync: string | null;
  totalSkins: number;
  cacheExists: boolean;
}

/**
 * URL API для получения данных скинов
 */
const CSGO_API_URL = 'https://raw.githubusercontent.com/ByMykel/CSGO-API/main/public/api/ru/skins_not_grouped.json';

/**
 * Путь к директории для хранения кэша
 */
const CACHE_DIR = path.join(process.cwd(), 'data');

/**
 * Путь к файлу кэша
 */
const CACHE_FILE_PATH = path.join(CACHE_DIR, 'skins-cache.json');

/**
 * Timeout для HTTP запросов (30 секунд)
 */
const HTTP_TIMEOUT = 30000;

/**
 * Сервис для работы с CSGO-API и кэшированием данных скинов
 */
class CsApiService {
  /**
   * Получает данные скинов из GitHub API
   *
   * @private
   * @returns {Promise<CSApiSkin[]>} Массив скинов
   * @throws {Error} При ошибке HTTP запроса
   */
  private async fetchSkinsFromAPI(): Promise<CSApiSkin[]> {
    try {
      const response = await axios.get<CSApiSkin[]>(CSGO_API_URL, {
        timeout: HTTP_TIMEOUT,
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'CS-Drop-Skin-Platform/1.0'
        }
      });

      if (!Array.isArray(response.data)) {
        throw new Error('Invalid response format: expected array of skins');
      }

      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        if (error.code === 'ECONNABORTED') {
          throw new Error(`API request timeout after ${HTTP_TIMEOUT}ms`);
        }
        if (error.response) {
          throw new Error(`API request failed with status ${error.response.status}: ${error.response.statusText}`);
        }
        if (error.request) {
          throw new Error('API request failed: No response received');
        }
      }
      throw new Error(`Failed to fetch skins from API: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Создает директорию для кэша, если она не существует
   *
   * @private
   * @returns {Promise<void>}
   */
  private async ensureCacheDirectoryExists(): Promise<void> {
    try {
      await fs.access(CACHE_DIR);
    } catch {
      await fs.mkdir(CACHE_DIR, { recursive: true });
      logger.info('Cache directory created', { path: CACHE_DIR });
    }
  }

  /**
   * Синхронизирует кэш скинов с данными из API
   * Использует атомарную запись через временный файл
   *
   * @public
   * @returns {Promise<SyncResult>} Результат синхронизации
   * @throws {Error} При ошибке получения данных или записи файла
   */
  public async syncSkinsCache(): Promise<SyncResult> {
    const startTime = Date.now();

    logger.info('Starting skins cache synchronization', {
      source: CSGO_API_URL
    });

    try {
      // Получаем данные из API
      const skins = await this.fetchSkinsFromAPI();

      logger.info('Successfully fetched skins from API', {
        totalSkins: skins.length
      });

      // Подготавливаем данные для кэша
      const cacheData: SkinsCacheData = {
        lastSync: new Date().toISOString(),
        totalSkins: skins.length,
        skins
      };

      // Создаем директорию, если её нет
      await this.ensureCacheDirectoryExists();

      // Атомарная запись через временный файл
      const tempFilePath = `${CACHE_FILE_PATH}.tmp`;

      await fs.writeFile(
        tempFilePath,
        JSON.stringify(cacheData, null, 2),
        'utf-8'
      );

      // Переименовываем временный файл в финальный (атомарная операция)
      await fs.rename(tempFilePath, CACHE_FILE_PATH);

      const duration = Date.now() - startTime;

      logger.info('Cache synchronization completed successfully', {
        totalSkins: skins.length,
        duration: `${duration}ms`,
        cachePath: CACHE_FILE_PATH
      });

      return {
        lastSync: cacheData.lastSync,
        totalSkins: cacheData.totalSkins,
        duration
      };
    } catch (error) {
      logger.error('Cache synchronization failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
        duration: `${Date.now() - startTime}ms`
      });
      throw error;
    }
  }

  /**
   * Получает скины из локального кэша
   *
   * @public
   * @returns {Promise<CSApiSkin[]>} Массив скинов или пустой массив, если кэш не существует
   */
  public async getSkinsFromCache(): Promise<CSApiSkin[]> {
    try {
      const fileContent = await fs.readFile(CACHE_FILE_PATH, 'utf-8');
      const cacheData: SkinsCacheData = JSON.parse(fileContent);

      if (!Array.isArray(cacheData.skins)) {
        logger.warn('Invalid cache data format: skins is not an array');
        return [];
      }

      return cacheData.skins;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        logger.info('Cache file does not exist', { path: CACHE_FILE_PATH });
        return [];
      }

      logger.error('Failed to read cache file', {
        error: error instanceof Error ? error.message : 'Unknown error',
        path: CACHE_FILE_PATH
      });

      return [];
    }
  }

  /**
   * Получает информацию о состоянии кэша
   *
   * @public
   * @returns {Promise<CacheInfo>} Информация о кэше
   */
  public async getCacheInfo(): Promise<CacheInfo> {
    try {
      const fileContent = await fs.readFile(CACHE_FILE_PATH, 'utf-8');
      const cacheData: SkinsCacheData = JSON.parse(fileContent);

      return {
        lastSync: cacheData.lastSync,
        totalSkins: cacheData.totalSkins,
        cacheExists: true
      };
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        return {
          lastSync: null,
          totalSkins: 0,
          cacheExists: false
        };
      }

      logger.error('Failed to get cache info', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      return {
        lastSync: null,
        totalSkins: 0,
        cacheExists: false
      };
    }
  }
}

// Экспортируем singleton инстанс сервиса
export const csApiService = new CsApiService();

// Экспортируем класс для тестирования
export default CsApiService;
