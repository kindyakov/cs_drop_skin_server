import { PrismaClient } from '@prisma/client';
import app from './app.js';
import { config } from './config/env.config.js';
import { startItemsSyncJob } from './jobs/syncItems.job.js';

/**
 * Prisma client instance for database operations
 */
const prisma = new PrismaClient({
  log: config.isDevelopment ? ['query', 'info', 'warn', 'error'] : ['warn', 'error'],
});

/**
 * Test database connection
 */
const testDatabaseConnection = async (): Promise<void> => {
  try {
    await prisma.$connect();
    console.log('✅ База данных успешно подключена');
  } catch (error) {
    console.error('❌ Не удалось подключиться к базе данных:', error);
    throw new Error('Не удалось подключиться к базе данных');
  }
};

/**
 * Graceful shutdown handler
 */
const gracefulShutdown = async (server: any): Promise<void> => {
  try {
    console.log('\n🔄 Запуск плавного завершения работы...');

    // Close HTTP server
    server.close(() => {
      console.log('🔌 HTTP-сервер закрыт');
    });

    // Disconnect from database
    await prisma.$disconnect();
    console.log('💾 Соединение с базой данных закрыто');

    console.log('✅ Завершено плавное завершение работы');
    process.exit(0);
  } catch (error) {
    console.error('❌ Ошибка при плавном завершении работы:', error);
    process.exit(1);
  }
};

/**
 * Start the HTTP server
 */
const startServer = async (): Promise<void> => {
  try {
    // Test database connection before starting server
    await testDatabaseConnection();

    // Start scheduled jobs
    startItemsSyncJob();

    // Start HTTP server
    const server = app.listen(config.port, () => {
      console.log(`
        ╔════════════════════════════════════════════╗
        ║   CS2 Case Opening Platform - Server       ║
        ╚════════════════════════════════════════════╝

        🚀 Сервер работает по порту ${config.port}
        🌍 Окружающая среда: ${config.nodeEnv}
        📡 Проверка работоспособности: http://localhost:${config.port}/health
        🔗 База данных: Подключена
        📝 Log level: ${config.logging.level}
        🔄 Process ID: ${process.pid}
      `);
    });

    // Handle graceful shutdown on SIGTERM
    process.on('SIGTERM', () => {
      console.log('📡 SIGTERM received');
      gracefulShutdown(server);
    });

    // Handle graceful shutdown on SIGINT (Ctrl+C)
    process.on('SIGINT', () => {
      console.log('📡 Полученный сигнал');
      gracefulShutdown(server);
    });

    // Handle uncaught exceptions
    process.on('uncaughtException', (error: Error) => {
      console.error('💥 Неперехваченное исключение:', error);
      gracefulShutdown(server);
    });

    // Handle unhandled promise rejections
    process.on('unhandledRejection', (reason: unknown) => {
      console.error('💥 Необработанный отказ:', reason);
      gracefulShutdown(server);
    });
  } catch (error) {
    console.error('❌ Не удалось запустить сервер:', error);

    // Ensure database is disconnected if startup fails
    try {
      await prisma.$disconnect();
    } catch (disconnectError) {
      console.error('❌ Ошибка при отключении базы данных:', disconnectError);
    }

    process.exit(1);
  }
};

// Start the server
startServer();

// Export prisma instance for use in other modules
export { prisma };
