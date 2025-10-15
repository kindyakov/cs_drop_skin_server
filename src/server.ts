import { PrismaClient } from '@prisma/client';

/**
 * Express application configuration
 */
import app from './app.js';

/**
 * Environment configuration with type safety
 */
import { config } from './config/env.config.js';

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
    console.log('✅ Database connected successfully');
  } catch (error) {
    console.error('❌ Failed to connect to database:', error);
    throw new Error('Database connection failed');
  }
};

/**
 * Graceful shutdown handler
 */
const gracefulShutdown = async (server: any): Promise<void> => {
  try {
    console.log('\n🔄 Starting graceful shutdown...');

    // Close HTTP server
    server.close(() => {
      console.log('🔌 HTTP server closed');
    });

    // Disconnect from database
    await prisma.$disconnect();
    console.log('💾 Database connection closed');

    console.log('✅ Graceful shutdown completed');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error during graceful shutdown:', error);
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

    // Start HTTP server
    const server = app.listen(config.port, () => {
      console.log(`
        ╔════════════════════════════════════════════╗
        ║   CS2 Case Opening Platform - Server       ║
        ╚════════════════════════════════════════════╝

        🚀 Server is running on port ${config.port}
        🌍 Environment: ${config.nodeEnv}
        📡 Health check: http://localhost:${config.port}/health
        🔗 Database: Connected
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
      console.log('📡 SIGINT received');
      gracefulShutdown(server);
    });

    // Handle uncaught exceptions
    process.on('uncaughtException', (error: Error) => {
      console.error('💥 Uncaught Exception:', error);
      gracefulShutdown(server);
    });

    // Handle unhandled promise rejections
    process.on('unhandledRejection', (reason: unknown) => {
      console.error('💥 Unhandled Rejection:', reason);
      gracefulShutdown(server);
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);

    // Ensure database is disconnected if startup fails
    try {
      await prisma.$disconnect();
    } catch (disconnectError) {
      console.error('❌ Error disconnecting database:', disconnectError);
    }

    process.exit(1);
  }
};

// Start the server
startServer();

// Export prisma instance for use in other modules
export { prisma };
