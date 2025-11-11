import axios, { AxiosError } from 'axios';
import { config } from '../config/env.config.js';
import { logger } from '../middleware/logger.middleware.js';

const MARKET_CSGO_API_BASE = 'https://market.csgo.com/api/v2';
const API_KEY = config.marketCs.apiKey;
const API_TIMEOUT = 10000;
const REQUEST_DELAY = 100; // Задержка между запросами (ms)

interface PriceResult {
  success: boolean;
  price?: number;
  error?: string;
}

/**
 * Сервис для получения цен скинов из market.csgo.com
 * API: https://market.csgo.com/ru/api/content/items#search-item-by-hash-name
 *
 * Используется при добавлении скинов в кейсы
 *
 * Важно: API возвращает список цен для разных вариантов скина (разные class/instance)
 * Мы берем минимальную цену (дешевую версию скина)
 */

/**
 * Получить цену одного скина по названию из маркета
 * @param marketHashName Полное имя скина (например: "AK-47 | Затерянная земля (Factory New)")
 * @returns Цена в копейках (минимальная из доступных) или ошибка
 */
export const fetchPriceForSkin = async (marketHashName: string): Promise<PriceResult> => {
  try {
    const response = await axios.get(`${MARKET_CSGO_API_BASE}/search-item-by-hash-name`, {
      params: {
        key: API_KEY,
        hash_name: marketHashName,
      },
      timeout: API_TIMEOUT,
    });

    if (response.data.success && response.data.data && Array.isArray(response.data.data)) {
      const items = response.data.data as any[];

      if (items.length > 0) {
        // Берем минимальную цену (самый дешевый вариант скина)
        const minPriceItem = items.reduce((min, current) =>
          current.price < min.price ? current : min
        );

        // Цена в API в копейках, проверяем это
        const price = minPriceItem.price;

        logger.debug('Цена скина получена', {
          marketHashName,
          price,
          variants: items.length, // Сколько вариантов найдено
          minPrice: minPriceItem.price,
          maxPrice: Math.max(...items.map((i: any) => i.price)),
        });

        return {
          success: true,
          price, // Уже в копейках согласно API
        };
      }
    }

    return {
      success: false,
      error: `Скин "${marketHashName}" не найден на market.csgo.com`,
    };
  } catch (error) {
    const message =
      error instanceof AxiosError
        ? `API ошибка (${error.response?.status}): ${error.message}`
        : `Неизвестная ошибка при получении цены`;

    logger.warn('Ошибка получения цены скина', {
      marketHashName,
      error: message,
    });

    return {
      success: false,
      error: message,
    };
  }
};

/**
 * Получить цены для нескольких скинов (с задержками для избежания rate-limiting)
 * @param marketHashNames Массив названий скинов
 * @returns Map с названиями и ценами / ошибками
 * @deprecated Используйте fetchPricesForMultipleSkinsBatch для более быстрой работы
 */
export const fetchPricesForMultipleSkins = async (
  marketHashNames: string[]
): Promise<Map<string, PriceResult>> => {
  const results = new Map<string, PriceResult>();

  for (const name of marketHashNames) {
    const result = await fetchPriceForSkin(name);
    results.set(name, result);

    // Задержка между запросами для избежания rate-limiting
    if (marketHashNames.indexOf(name) < marketHashNames.length - 1) {
      await new Promise((resolve) => setTimeout(resolve, REQUEST_DELAY));
    }
  }

  return results;
};

/**
 * Получить цены для нескольких скинов используя батч-эндпоинт (оптимизированная версия)
 * Использует search-list-items-by-hash-name-all для получения цен за один запрос
 *
 * Преимущества:
 * - До 50 скинов за один HTTP запрос (вместо 50 запросов)
 * - Нет задержек между запросами
 * - Меньше нагрузки на API market.csgo.com
 *
 * @param marketHashNames Массив названий скинов (до 50 за запрос)
 * @returns Map с названиями и ценами / ошибками
 */
export const fetchPricesForMultipleSkinsBatch = async (
  marketHashNames: string[]
): Promise<Map<string, PriceResult>> => {
  const results = new Map<string, PriceResult>();

  if (marketHashNames.length === 0) {
    return results;
  }

  // Разбить на чанки по 50 элементов (лимит API без extended=1)
  const BATCH_SIZE = 50;
  const chunks: string[][] = [];
  for (let i = 0; i < marketHashNames.length; i += BATCH_SIZE) {
    chunks.push(marketHashNames.slice(i, i + BATCH_SIZE));
  }

  logger.info('Батч-запрос цен скинов', {
    totalSkins: marketHashNames.length,
    chunks: chunks.length,
    batchSize: BATCH_SIZE,
  });

  // Обработать каждый чанк
  for (const chunk of chunks) {
    try {
      // Построить query параметры для массива list_hash_name[]
      const params = new URLSearchParams();
      params.append('key', API_KEY);

      chunk.forEach((name) => {
        params.append('list_hash_name[]', name);
      });

      const response = await axios.get(
        `${MARKET_CSGO_API_BASE}/search-list-items-by-hash-name-all?${params.toString()}`,
        {
          timeout: API_TIMEOUT * 2, // Увеличенный timeout для батч-запроса
        }
      );

      if (response.data.success && response.data.data) {
        const data = response.data.data as Record<string, any[]>;

        // Обработать каждый скин в ответе
        for (const [marketHashName, offers] of Object.entries(data)) {
          if (Array.isArray(offers) && offers.length > 0) {
            // Найти минимальную цену среди всех предложений
            const minPriceOffer = offers.reduce((min, current) => {
              const currentPrice = parseInt(current.price, 10);
              const minPrice = parseInt(min.price, 10);
              return currentPrice < minPrice ? current : min;
            });

            const price = parseInt(minPriceOffer.price, 10);

            logger.debug('Цена скина получена (батч)', {
              marketHashName,
              price,
              offersCount: offers.length,
              minPrice: price,
              maxPrice: Math.max(...offers.map((o: any) => parseInt(o.price, 10))),
            });

            results.set(marketHashName, {
              success: true,
              price,
            });
          } else {
            results.set(marketHashName, {
              success: false,
              error: `Скин "${marketHashName}" не найден на market.csgo.com`,
            });
          }
        }

        // Проверить, все ли скины из чанка были в ответе
        for (const name of chunk) {
          if (!results.has(name)) {
            results.set(name, {
              success: false,
              error: `Скин "${name}" не найден в ответе API`,
            });
          }
        }
      } else {
        // Если весь запрос не удался, добавить ошибку для всех скинов в чанке
        for (const name of chunk) {
          results.set(name, {
            success: false,
            error: 'Ошибка получения данных от API',
          });
        }
      }
    } catch (error) {
      const message =
        error instanceof AxiosError
          ? `API ошибка (${error.response?.status}): ${error.message}`
          : `Неизвестная ошибка при получении цен`;

      logger.error('Ошибка батч-запроса цен скинов', {
        error: message,
        chunk,
      });

      // Добавить ошибку для всех скинов в этом чанке
      for (const name of chunk) {
        results.set(name, {
          success: false,
          error: message,
        });
      }
    }

    // Небольшая задержка между чанками для избежания rate-limiting
    if (chunks.indexOf(chunk) < chunks.length - 1) {
      await new Promise((resolve) => setTimeout(resolve, REQUEST_DELAY));
    }
  }

  logger.info('Батч-запрос цен завершен', {
    totalSkins: marketHashNames.length,
    successful: Array.from(results.values()).filter((r) => r.success).length,
    failed: Array.from(results.values()).filter((r) => !r.success).length,
  });

  return results;
};
