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
