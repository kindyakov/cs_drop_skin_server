import cron from 'node-cron';
import { logger } from '@middleware/logger.middleware.js';
import { csApiService } from '../services/csApi.service.js';

/**
 * Запуск синхронизации скинов из CSGO-API
 * Выполняется каждый день в 3:00 ночи по московскому времени
 */
export const startItemsSyncJob = () => {
  // Cron расписание: каждый день в 3:00
  cron.schedule('0 3 * * *', async () => {
    const startTime = Date.now();

    try {
      logger.info('🔄 Запуск запланированной синхронизации скинов CS', {
        scheduledTime: new Date().toISOString(),
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      });

      // Проверка текущего состояния кэша перед синхронизацией
      const cacheInfoBefore = await csApiService.getCacheInfo();

      logger.info('Состояние кэша перед синхронизацией', {
        cacheExists: cacheInfoBefore.cacheExists,
        totalSkinsInCache: cacheInfoBefore.totalSkins,
        lastSync: cacheInfoBefore.lastSync,
      });

      // Выполнение синхронизации
      const syncResult = await csApiService.syncSkinsCache();

      const totalDuration = Date.now() - startTime;

      logger.info('✅ Запланированная синхронизация скинов CS успешно завершена', {
        totalSkins: syncResult.totalSkins,
        syncDuration: `${syncResult.duration}ms`,
        totalJobDuration: `${totalDuration}ms`,
        lastSync: syncResult.lastSync,
        skinsAdded: syncResult.totalSkins - cacheInfoBefore.totalSkins,
      });

      // Проверка состояния после синхронизации
      const cacheInfoAfter = await csApiService.getCacheInfo();

      logger.info('Cache state after sync', {
        cacheExists: cacheInfoAfter.cacheExists,
        totalSkinsInCache: cacheInfoAfter.totalSkins,
        lastSync: cacheInfoAfter.lastSync,
      });
    } catch (error) {
      const totalDuration = Date.now() - startTime;

      logger.error('❌ Не удалось выполнить запланированную синхронизацию скинов CS', {
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
        duration: `${totalDuration}ms`,
        timestamp: new Date().toISOString(),
      });

      // В production можно добавить уведомление в Telegram/Slack
      // await notifyAdminsAboutSyncFailure(error);
    }
  });

  logger.info('✅ Запущено задание Cron для синхронизации скинов CS', {
    schedule: '0 3 * * * (Every day at 3:00 AM)',
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    nextRun: 'Tomorrow at 3:00 AM',
  });
};

/**
 * Ручной запуск синхронизации скинов (для админ панели или CLI)
 * Можно вызвать из API endpoint или командной строки
 */
export const manualSyncItems = async (): Promise<void> => {
  const startTime = Date.now();

  try {
    logger.info('🔄 Manual CSGO skins synchronization started', {
      initiatedAt: new Date().toISOString(),
    });

    const syncResult = await csApiService.syncSkinsCache();
    const totalDuration = Date.now() - startTime;

    logger.info('✅ Manual CSGO skins synchronization completed', {
      totalSkins: syncResult.totalSkins,
      syncDuration: `${syncResult.duration}ms`,
      totalDuration: `${totalDuration}ms`,
      lastSync: syncResult.lastSync,
    });
  } catch (error) {
    const totalDuration = Date.now() - startTime;

    logger.error('❌ Manual CSGO skins synchronization failed', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      duration: `${totalDuration}ms`,
    });

    throw error;
  }
};
