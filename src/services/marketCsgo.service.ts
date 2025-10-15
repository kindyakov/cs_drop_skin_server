import axios from 'axios';
import { PrismaClient } from '@prisma/client';
import { config } from '../config/env.config.js';
import { logger } from '../middleware/logger.middleware.js';

const prisma = new PrismaClient();

interface MarketItem {
  market_hash_name: string;
  name: string;
  price: number; // в центах USD
  image: string;
  rarity?: string;
}

const fetchItemsFromMarket = async (): Promise<MarketItem[]> => {
  try {
    const response = await axios.get('https://market.csgo.com/api/v2/prices/USD.json', {
      params: { key: config.marketCsgo.apiKey },
      timeout: 30000,
    });

    const items: MarketItem[] = [];
    for (const [hashName, data] of Object.entries(response.data.items)) {
      items.push({
        market_hash_name: hashName,
        name: (data as any).name || hashName,
        price: (data as any).price || 0,
        image: `https://community.cloudflare.steamstatic.com/economy/image/${hashName}`,
        rarity: undefined,
      });
    }

    return items;
  } catch (error) {
    logger.error('Ошибка при получении данных с market.csgo.com', { error });
    throw error;
  }
};

export const syncItems = async (): Promise<{ added: number; updated: number }> => {
  try {
    logger.info('Начало синхронизации скинов');

    const marketItems = await fetchItemsFromMarket();
    let added = 0;
    let updated = 0;

    for (const marketItem of marketItems) {
      const existingItem = await prisma.item.findUnique({
        where: { marketHashName: marketItem.market_hash_name },
      });

      // Конвертация центов USD в копейки RUB (примерно)
      const priceInKopecks = Math.round(marketItem.price * 100);

      if (existingItem) {
        // Обновить только цену
        await prisma.item.update({
          where: { id: existingItem.id },
          data: { price: priceInKopecks },
        });
        updated++;
      } else {
        // Создать новый
        await prisma.item.create({
          data: {
            marketHashName: marketItem.market_hash_name,
            displayName: marketItem.name,
            imageUrl: marketItem.image,
            price: priceInKopecks,
            rarity: 'CONSUMER', // По умолчанию
          },
        });
        added++;
      }
    }

    logger.info('Синхронизация завершена', { added, updated });
    return { added, updated };
  } catch (error) {
    logger.error('Ошибка синхронизации', { error });
    throw error;
  }
};
