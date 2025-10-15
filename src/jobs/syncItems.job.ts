import cron from 'node-cron';
import { syncItems } from '@services/marketCsgo.service.js';
import { logger } from '@middleware/logger.middleware.js';

// Запуск каждый день в 3:00 ночи
export const startItemsSyncJob = () => {
  cron.schedule('0 3 * * *', async () => {
    try {
      logger.info('Запуск синхронизации скинов по расписанию');
      const result = await syncItems();
      logger.info('Синхронизация завершена', result);
    } catch (error) {
      logger.error('Ошибка при синхронизации скинов', { error });
    }
  });

  logger.info('Cron job синхронизации скинов запущен (каждый день в 3:00)');
};
