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
