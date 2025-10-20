/**
 * Типы категорий для CS:GO Case Opening Platform
 */

// ==============================================
// ОСНОВНЫЕ ИНТЕРФЕЙСЫ КАТЕГОРИЙ
// ==============================================

/**
 * Базовый интерфейс категории
 */
export interface ICategory {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  imageUrl: string | null;
  order: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Категория с количеством кейсов
 */
export interface ICategoryWithCount extends ICategory {
  _count: {
    cases: number;
  };
}

/**
 * Категория с кейсами
 */
export interface ICategoryWithCases extends ICategory {
  cases: Array<{
    id: string;
    name: string;
    slug: string;
    imageUrl: string;
    price: number;
    isActive: boolean;
  }>;
}

// ==============================================
// ADMIN ИНТЕРФЕЙСЫ
// ==============================================

/**
 * Входные данные для создания категории (Admin)
 */
export interface ICreateCategoryInput {
  name: string;
  description?: string;
  imageUrl?: string;
  order?: number;
  isActive?: boolean;
}

/**
 * Входные данные для обновления категории (Admin)
 */
export interface IUpdateCategoryInput {
  name?: string;
  description?: string;
  imageUrl?: string;
  order?: number;
  isActive?: boolean;
}

/**
 * Назначение кейсов категории
 */
export interface IAssignCasesToCategoryInput {
  caseIds: string[]; // массив ID кейсов для назначения
}
