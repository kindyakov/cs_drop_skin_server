import { PrismaClient } from '@prisma/client';
import type {
  IGetUsersFilters,
  IUpdateUserBalanceInput,
} from '../../types/admin.types.js';
import type { IUser } from '../../types/user.types.js';
import { NotFoundError, ValidationError } from '../../utils/errors.util.js';
import { logger } from '../../middleware/logger.middleware.js';

const prisma = new PrismaClient();

/**
 * Получить список пользователей с фильтрами
 */
export const getAllUsers = async (filters: IGetUsersFilters = {}): Promise<IUser[]> => {
  try {
    const { role, search, limit = 50, offset = 0 } = filters;

    const where: any = {};

    // Фильтр по роли
    if (role) {
      where.role = role;
    }

    // Поиск по username
    if (search) {
      where.username = {
        contains: search,
        mode: 'insensitive',
      };
    }

    const users = await prisma.user.findMany({
      where,
      take: limit,
      skip: offset,
      orderBy: { createdAt: 'desc' },
    });

    logger.info('Список пользователей получен', {
      count: users.length,
      filters,
    });

    return users as IUser[];
  } catch (error) {
    logger.error('Ошибка получения пользователей', { error, filters });
    throw error;
  }
};

/**
 * Заблокировать/разблокировать пользователя
 */
export const toggleUserBlock = async (userId: string): Promise<IUser> => {
  try {
    // Проверить существование пользователя
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new NotFoundError('Пользователь не найден');
    }

    // Нельзя заблокировать админа
    if (user.role === 'ADMIN') {
      throw new ValidationError('Нельзя заблокировать администратора');
    }

    // Переключить статус блокировки
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        isBlocked: !(user as any).isBlocked,
      },
    });

    logger.info('Статус пользователя изменён', {
      userId,
      newStatus: (updatedUser as any).isBlocked ? 'blocked' : 'active',
    });

    return updatedUser as IUser;
  } catch (error) {
    logger.error('Ошибка изменения статуса пользователя', { error, userId });
    throw error;
  }
};

/**
 * Обновить баланс пользователя (admin adjustment)
 */
export const updateUserBalance = async (
  userId: string,
  input: IUpdateUserBalanceInput
): Promise<IUser> => {
  try {
    // Проверить существование пользователя
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new NotFoundError('Пользователь не найден');
    }

    const newBalance = user.balance + input.amount;

    // Баланс не может быть отрицательным
    if (newBalance < 0) {
      throw new ValidationError('Баланс не может быть отрицательным');
    }

    // Обновить баланс в транзакции
    const updatedUser = await prisma.$transaction(async (tx) => {
      // Создать транзакцию для истории
      await tx.transaction.create({
        data: {
          userId,
          amount: input.amount,
          type: input.amount > 0 ? 'DEPOSIT' : 'WITHDRAWAL',
          status: 'COMPLETED',
        },
      });

      // Обновить баланс
      return await tx.user.update({
        where: { id: userId },
        data: { balance: newBalance },
      });
    });

    logger.info('Баланс пользователя обновлён админом', {
      userId,
      amount: input.amount,
      newBalance,
      reason: input.reason,
    });

    return updatedUser as IUser;
  } catch (error) {
    logger.error('Ошибка обновления баланса', { error, userId, input });
    throw error;
  }
};
