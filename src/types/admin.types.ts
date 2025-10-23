// ==============================================
// ADMIN CASE MANAGEMENT
// ==============================================

/**
 * Входные данные для создания кейса (Admin)
 */
export interface ICreateCaseInput {
  name: string;
  description?: string;
  imageUrl: string;
  price: number; // в копейках
  categoryId?: string;
  isActive?: boolean; // по умолчанию true
}

/**
 * Входные данные для обновления кейса (Admin)
 */
export interface IUpdateCaseInput {
  name?: string;
  description?: string;
  imageUrl?: string;
  price?: number;
  categoryId?: string;
  isActive?: boolean;
}

/**
 * Входные данные для добавления предмета в кейс
 */
export interface IAddItemToCaseInput {
  itemId: string;
  chancePercent: number; // 0.01 - 100
}

/**
 * Массив предметов для добавления в кейс
 */
export interface IAddItemsToCaseInput {
  items: IAddItemToCaseInput[];
}

// ==============================================
// ADMIN USER MANAGEMENT
// ==============================================

/**
 * Фильтры для получения списка пользователей
 */
export interface IGetUsersFilters {
  role?: 'USER' | 'ADMIN';
  search?: string; // поиск по username
  limit?: number;
  offset?: number;
}

/**
 * Входные данные для обновления баланса пользователя
 */
export interface IUpdateUserBalanceInput {
  amount: number; // в копейках, может быть отрицательным для списания
  reason?: string; // причина изменения
}

// ==============================================
// ADMIN STATISTICS
// ==============================================

/**
 * Статистика дашборда для админа
 */
export interface IAdminDashboardStats {
  users: {
    total: number;
    newToday: number;
    newThisWeek: number;
  };
  revenue: {
    total: number; // всего заработано в копейках
    today: number;
    thisWeek: number;
    thisMonth: number;
  };
  openings: {
    total: number;
    today: number;
    thisWeek: number;
  };
  cases: {
    total: number;
    active: number;
  };
}

/**
 * Популярные кейсы
 */
export interface IPopularCase {
  id: string;
  name: string;
  imageUrl: string;
  openingsCount: number;
  revenue: number; // в копейках
}

/**
 * Недавние транзакции
 */
export interface IRecentTransaction {
  id: string;
  userId: string;
  username: string;
  type: 'DEPOSIT' | 'WITHDRAWAL';
  amount: number;
  status: 'PENDING' | 'COMPLETED' | 'FAILED';
  createdAt: Date;
}
