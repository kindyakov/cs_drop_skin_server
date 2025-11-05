import cron from 'node-cron';
import { prisma } from '../config/database.js';
import { logger } from '../middleware/logger.middleware.js';

/**
 * Cron job для автоматической очистки истекших Exnode транзакций
 *
 * Запускается каждый час и проверяет все PENDING транзакции Exnode,
 * у которых истекло время оплаты (expiresAt < текущее время).
 *
 * Такие транзакции переводятся в статус FAILED.
 *
 * Это подстраховка на случай, если webhook от Exnode не пришел.
 */
export function startCleanupExpiredExnodeTransactionsJob() {
  // Запускать каждый час в начале часа (например: 10:00, 11:00, 12:00)
  cron.schedule('0 * * * *', async () => {
    try {
      const now = new Date();

      logger.debug('Запуск очистки транзакций Exnode с истекшим сроком действия', {
        timestamp: now.toISOString(),
      });

      // Найти и обновить все истекшие PENDING транзакции Exnode
      const result = await prisma.transaction.updateMany({
        where: {
          provider: 'EXNODE',
          status: 'PENDING',
          expiresAt: {
            not: null, // Только транзакции с установленным expiresAt
            lt: now, // expiresAt меньше текущего времени (истекло)
          },
        },
        data: {
          status: 'FAILED',
        },
      });

      // Логировать только если были обновления
      if (result.count > 0) {
        logger.info('Транзакции Exnode с истекшим сроком действия очищены', {
          count: result.count,
          timestamp: now.toISOString(),
        });
      }
    } catch (error) {
      logger.error('Не удалось очистить транзакции Exnode с истекшим сроком действия', {
        error,
        timestamp: new Date().toISOString(),
      });
    }
  });

  logger.info(
    '✅ Запущен cron по очистке просроченных транзакций Exnode (запускается каждый час в :00)'
  );
}

/**
 * Остановить cron job (для graceful shutdown)
 */
export function stopCleanupExpiredExnodeTransactionsJob() {
  // node-cron автоматически останавливает все задачи при завершении процесса
  logger.info('Cleanup expired Exnode transactions job stopped');
}
