import { PrismaClient } from '@prisma/client';
import { types } from 'pg';

// Настроить парсинг INT8 (bigint) как number вместо string
// По умолчанию pg возвращает bigint как string для безопасности
// Для наших значений (до 2,147,483,647 копеек) это безопасно преобразовывать в number
types.setTypeParser(types.builtins.INT8, (value: string) => {
  return parseInt(value, 10);
});

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  });

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

export const connectDatabase = async () => {
  try {
    await prisma.$connect();
    console.log('✅ Database connected successfully');
  } catch (error) {
    console.error('❌ Database connection failed:', error);
    process.exit(1);
  }
};

export const disconnectDatabase = async () => {
  await prisma.$disconnect();
  console.log('Database disconnected');
};
