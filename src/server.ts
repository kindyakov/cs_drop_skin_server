import http from 'http';
import app from './app.js';
import { config } from './config/env.config.js';
import { prisma } from './config/database.js';
import { initializeSocket } from './config/socket.config.js';
import { logger } from './middleware/logger.middleware.js';
import { startItemsSyncJob } from './jobs/syncItems.job.js';

const PORT = config.port;

// Создать HTTP сервер
const httpServer = http.createServer(app);

// Инициализировать Socket.io
const io = initializeSocket(httpServer);

/**
 * Запуск сервера
 */
const startServer = async () => {
  try {
    // Проверка подключения к БД
    await prisma.$connect();
    logger.info('Подключение к базе данных установлено');

    // Запуск cron job для синхронизации скинов
    startItemsSyncJob();

    // Запуск сервера
    httpServer.listen(PORT, () => {
      logger.info(`🚀 Сервер запущен на порту ${PORT}`);
      logger.info(`📡 WebSocket сервер активен`);
      logger.info(`🌍 CORS origin: ${config.cors.origin}`);
    });
  } catch (error) {
    logger.error('Ошибка запуска сервера', { error });
    process.exit(1);
  }
};

/**
 * Graceful shutdown
 */
const gracefulShutdown = async (signal: string) => {
  logger.info(`${signal} получен. Завершение работы...`);

  // Закрыть Socket.io соединения
  io.close(() => {
    logger.info('Socket.io соединения закрыты');
  });

  // Закрыть HTTP сервер
  httpServer.close(() => {
    logger.info('HTTP сервер остановлен');
  });

  // Отключиться от БД
  await prisma.$disconnect();
  logger.info('Отключение от базы данных');

  process.exit(0);
};

// Обработка сигналов завершения
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Обработка необработанных ошибок
process.on('unhandledRejection', (reason, promise) => {
  logger.error('Необработанное отклонение Promise', { reason, promise });
});

process.on('uncaughtException', (error) => {
  logger.error('Необработанное исключение', { error });
  process.exit(1);
});

// Запустить сервер
startServer();
