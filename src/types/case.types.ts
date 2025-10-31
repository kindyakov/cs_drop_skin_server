import { IItem } from './item.types';

// Базовый интерфейс кейса (из Prisma)
export interface ICase {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  imageUrl: string;
  price: number; // в копейках
  isActive: boolean;
  maxOpenings: number;
  openingsCount: number;
  categoryId: string | null; // ID категории (может быть NULL)
  createdAt: Date;
  updatedAt: Date;
}

// Кейс с предметами
export interface ICaseWithItems extends ICase {
  items: ICaseItemWithDetails[];
}

// Связь кейс-предмет с деталями предмета
export interface ICaseItemWithDetails {
  id: string;
  chancePercent: number;
  item: IItem;
}

/**
 * Кейс с информацией о категории
 */
export interface ICaseWithCategory extends ICase {
  category: {
    id: string;
    name: string;
    slug: string;
  } | null;
}

/**
 * Публичный формат кейса для клиента
 * Без чувствительных полей: maxOpenings, openingsCount, categoryId, createdAt, updatedAt
 */
export interface ICasePublic {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  imageUrl: string;
  price: number; // в копейках
  category: {
    id: string;
    name: string;
    slug: string;
  } | null;
}

export interface IFiltersCases {
  from: number;
  to: number;
}

/**
 * Параметры фильтрации кейсов
 */
export interface ICaseFilters {
  search?: string; // Поиск по названию кейса
  from?: number; // Минимальная цена
  to?: number; // Максимальная цена
}
