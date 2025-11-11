import { PrismaClient } from '@prisma/client';
import type {
  IAdminDashboardStats,
  IPopularCase,
  IRecentTransaction,
} from '../../types/admin.types.js';
import { logger } from '../../middleware/logger.middleware.js';

const prisma = new PrismaClient();

/**
 * Получить статистику дашборда
 */
export const getDashboardStats = async (): Promise<IAdminDashboardStats> => {
  try {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    // Параллельные запросы для оптимизации
    const [
      totalUsers,
      newUsersToday,
      newUsersThisWeek,
      totalCases,
      activeCases,
      totalOpenings,
      openingsToday,
      openingsThisWeek,
      totalRevenue,
      revenueToday,
      revenueThisWeek,
      revenueThisMonth,
    ] = await Promise.all([
      // Users
      prisma.user.count(),
      prisma.user.count({
        where: { createdAt: { gte: todayStart } },
      }),
      prisma.user.count({
        where: { createdAt: { gte: weekStart } },
      }),

      // Cases
      prisma.case.count(),
      prisma.case.count({ where: { isActive: true } }),

      // Openings
      prisma.caseOpening.count(),
      prisma.caseOpening.count({
        where: { openedAt: { gte: todayStart } },
      }),
      prisma.caseOpening.count({
        where: { openedAt: { gte: weekStart } },
      }),

      // Revenue (DEPOSIT транзакции со статусом COMPLETED)
      prisma.transaction.aggregate({
        where: {
          type: 'DEPOSIT',
          status: 'COMPLETED',
        },
        _sum: { amount: true },
      }),
      prisma.transaction.aggregate({
        where: {
          type: 'DEPOSIT',
          status: 'COMPLETED',
          createdAt: { gte: todayStart },
        },
        _sum: { amount: true },
      }),
      prisma.transaction.aggregate({
        where: {
          type: 'DEPOSIT',
          status: 'COMPLETED',
          createdAt: { gte: weekStart },
        },
        _sum: { amount: true },
      }),
      prisma.transaction.aggregate({
        where: {
          type: 'DEPOSIT',
          status: 'COMPLETED',
          createdAt: { gte: monthStart },
        },
        _sum: { amount: true },
      }),
    ]);

    const stats: IAdminDashboardStats = {
      users: {
        total: totalUsers,
        newToday: newUsersToday,
        newThisWeek: newUsersThisWeek,
      },
      revenue: {
        total: totalRevenue._sum.amount || 0,
        today: revenueToday._sum.amount || 0,
        thisWeek: revenueThisWeek._sum.amount || 0,
        thisMonth: revenueThisMonth._sum.amount || 0,
      },
      openings: {
        total: totalOpenings,
        today: openingsToday,
        thisWeek: openingsThisWeek,
      },
      cases: {
        total: totalCases,
        active: activeCases,
      },
    };

    logger.info('Статистика дашборда получена');
    return stats;
  } catch (error) {
    logger.error('Ошибка получения статистики дашборда', { error });
    throw error;
  }
};

/**
 * Получить популярные кейсы
 */
export const getPopularCases = async (limit: number = 10): Promise<IPopularCase[]> => {
  try {
    // Получить кейсы с количеством открытий и доходом
    const casesWithStats = await prisma.caseOpening.groupBy({
      by: ['caseId'],
      _count: { id: true },
      orderBy: {
        _count: { id: 'desc' },
      },
      take: limit,
    });

    // Получить детали кейсов
    const caseIds = casesWithStats.map((c) => c.caseId);
    const cases = await prisma.case.findMany({
      where: { id: { in: caseIds } },
      select: {
        id: true,
        name: true,
        imageUrl: true,
        price: true,
      },
    });

    // Создать map для быстрого доступа
    const casesMap = new Map(cases.map((c) => [c.id, c]));

    // Собрать результат (цены теперь в копейках)
    const popularCases: IPopularCase[] = casesWithStats.map((stat) => {
      const caseData = casesMap.get(stat.caseId);
      const price = caseData?.price ? caseData.price : 0;
      return {
        id: stat.caseId,
        name: caseData?.name || 'Unknown',
        imageUrl: caseData?.imageUrl || '',
        openingsCount: stat._count.id,
        revenue: price * stat._count.id,
      };
    });

    logger.info('Популярные кейсы получены', { count: popularCases.length });
    return popularCases;
  } catch (error) {
    logger.error('Ошибка получения популярных кейсов', { error });
    throw error;
  }
};

/**
 * Получить недавние транзакции
 */
export const getRecentTransactions = async (limit: number = 20): Promise<IRecentTransaction[]> => {
  try {
    const transactions = await prisma.transaction.findMany({
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        user: {
          select: {
            id: true,
            username: true,
          },
        },
      },
    });

    const recentTransactions: IRecentTransaction[] = transactions.map((t) => ({
      id: t.id,
      userId: t.userId,
      username: t.user.username,
      type: t.type as 'DEPOSIT' | 'WITHDRAWAL',
      amount: t.amount,
      status: t.status as 'PENDING' | 'COMPLETED' | 'FAILED',
      createdAt: t.createdAt,
      provider: t.provider as 'EXNODE' | 'YOOKASSA',
      cryptoAmount: t.cryptoAmount,
      fiatCurrency: t.fiatCurrency,
      expiresAt: t.expiresAt,
    }));

    logger.info('Недавние транзакции получены', { count: recentTransactions.length });
    return recentTransactions;
  } catch (error) {
    logger.error('Ошибка получения недавних транзакций', { error });
    throw error;
  }
};
