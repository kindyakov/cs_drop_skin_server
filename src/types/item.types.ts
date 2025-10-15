import { ItemRarity, ItemStatus } from './constants';

// Базовый интерфейс предмета (из Prisma)
export interface IItem {
  id: string;
  marketHashName: string;
  displayName: string;
  imageUrl: string;
  price: number; // в копейках
  rarity: ItemRarity;
  createdAt: Date;
  updatedAt: Date;
}

// Предмет в инвентаре пользователя
export interface IUserItem {
  id: string;
  userId: string;
  itemId: string;
  acquiredAt: Date;
  status: ItemStatus;
  item: IItem;
}
