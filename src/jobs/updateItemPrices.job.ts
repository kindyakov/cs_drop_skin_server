import cron from 'node-cron';
import { PrismaClient } from '@prisma/client';
import { logger } from '../middleware/logger.middleware.js';
import * as marketPriceService from '../services/marketPrice.service.js';

const prisma = new PrismaClient();

/**
 * Крон-задача для ежедневного обновления цен скинов из market.csgo.com
 * Запускается ежедневно в 04:00 (после синхронизации скинов в 03:00)
 *
 * Функционал:
 * - Получает все скины из таблицы items
 * - Запрашивает цены у market.csgo.com по marketHashName
 * - Обновляет цены в БД
 * - Логирует результаты и ошибки
 */

export const startUpdateItemPricesJob = () => {
  // Расписание: 04:00 каждый день
  cron.schedule('0 4 * * *', async () => {
    logger.info('Запуск крон-задачи обновления цен скинов');

    try {
      // 1. Получить все скины из БД
      const items = await prisma.item.findMany({
        select: {
          id: true,
          marketHashName: true,
          price: true,
        },
      });

      if (items.length === 0) {
        logger.info('Нет скинов в базе для обновления цен');
        return;
      }

      logger.info('Начало обновления цен', { totalSkins: items.length });

      // 2. Получить цены для всех скинов
      const marketHashNames = items.map((item) => item.marketHashName);
      const priceResults = await marketPriceService.fetchPricesForMultipleSkins(marketHashNames);

      // 3. Обновить цены в БД
      let updated = 0;
      let failed = 0;
      const failedSkins: string[] = [];
      const prices: number[] = [];

      for (const [marketHashName, result] of priceResults) {
        const item = items.find((i) => i.marketHashName === marketHashName);

        if (!item) continue;

        if (result.success && result.price) {
          // Обновить цену в БД
          await prisma.item.update({
            where: { id: item.id },
            data: { price: result.price },
          });

          updated++;
          prices.push(result.price);

          // Логировать значительные изменения цены (более 10%)
          const oldPrice = item.price.toNumber();
          const priceChange = Math.abs((result.price - oldPrice) / oldPrice) * 100;

          if (priceChange > 10) {
            logger.debug('Значительное изменение цены скина', {
              marketHashName,
              oldPrice: oldPrice / 100,
              newPrice: result.price / 100,
              changePercent: priceChange.toFixed(2),
            });
          }
        } else {
          failed++;
          failedSkins.push(`${marketHashName}: ${result.error}`);
        }
      }

      // 4. Расчет статистики
      const avgPrice = prices.length > 0 ? Math.round(prices.reduce((a, b) => a + b, 0) / prices.length) : 0;
      const minPrice = prices.length > 0 ? Math.min(...prices) : 0;
      const maxPrice = prices.length > 0 ? Math.max(...prices) : 0;

      // 5. Логирование результатов
      logger.info('Обновление цен завершено', {
        totalSkins: items.length,
        updated,
        failed,
        successRate: `${((updated / items.length) * 100).toFixed(2)}%`,
        avgPrice: avgPrice / 100,
        minPrice: minPrice / 100,
        maxPrice: maxPrice / 100,
      });

      // 6. Логирование ошибок если они есть
      if (failed > 0) {
        logger.warn('Ошибки при обновлении цен', {
          failedSkins: failedSkins.slice(0, 10), // Показываем первые 10
          totalFailed: failed,
        });
      }
    } catch (error) {
      logger.error('Критическая ошибка при обновлении цен скинов', { error });
    }
  });

  logger.info('Крон-задача обновления цен скинов инициализирована (каждый день в 04:00)');
};

/**
 * Ручное обновление цен всех скинов (для CLI-скрипта или тестирования)
 */
export const manualUpdateItemPrices = async (): Promise<{
  updated: number;
  failed: number;
  avgPrice: number;
}> => {
  logger.info('Ручное обновление цен скинов');

  try {
    const items = await prisma.item.findMany({
      select: {
        id: true,
        marketHashName: true,
        price: true,
      },
    });

    if (items.length === 0) {
      logger.warn('Нет скинов в базе для обновления');
      return { updated: 0, failed: 0, avgPrice: 0 };
    }

    const marketHashNames = items.map((item) => item.marketHashName);
    const priceResults = await marketPriceService.fetchPricesForMultipleSkins(marketHashNames);

    let updated = 0;
    let failed = 0;
    const prices: number[] = [];

    for (const [marketHashName, result] of priceResults) {
      const item = items.find((i) => i.marketHashName === marketHashName);
      if (!item) continue;

      if (result.success && result.price) {
        await prisma.item.update({
          where: { id: item.id },
          data: { price: result.price },
        });
        updated++;
        prices.push(result.price);
      } else {
        failed++;
      }
    }

    const avgPrice = prices.length > 0 ? Math.round(prices.reduce((a, b) => a + b, 0) / prices.length) : 0;

    logger.info('Ручное обновление завершено', {
      updated,
      failed,
      avgPrice: avgPrice / 100,
    });

    return { updated, failed, avgPrice };
  } catch (error) {
    logger.error('Ошибка ручного обновления цен', { error });
    throw error;
  }
};
