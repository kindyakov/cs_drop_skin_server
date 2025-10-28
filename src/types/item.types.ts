import { ItemRarity, ItemStatus } from './constants';

// Базовый интерфейс предмета (из Prisma)
export interface IItem {
  id: string;
  marketHashName: string;
  displayName: string;
  imageUrl: string;
  weaponName?: string | null; // Название оружия (AK-47, AWP и т.д.)
  skinName?: string | null; // Название скина
  quality?: string | null; // Качество (Поношенное, Немного поношенное и т.д.)
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
