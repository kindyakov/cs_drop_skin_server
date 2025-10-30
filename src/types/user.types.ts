import { UserRole } from './constants';
import { IUserItem } from './item.types';

// Базовый интерфейс пользователя (из Prisma)
export interface IUser {
  id: string;
  steamId: string | null;
  vkId: string | null;
  username: string;
  avatarUrl: string | null;
  balance: number;
  role: UserRole;
  isBlocked: boolean;
  tradeUrl: string | null;
  favoriteCaseId: string | null;
  bestDropItemId: string | null;
  createdAt: Date;
  updatedAt: Date;
}

// Публичный профиль (без чувствительных данных)
export interface IUserProfile {
  id: string;
  username: string;
  avatarUrl: string | null;
  balance: number;
  role: UserRole;
  isBlocked: boolean;
  tradeUrl: string | null;
  createdAt: Date;
}

// Ответ при авторизации
export interface IAuthResponse {
  token: string;
  user: IUserProfile;
}

/**
 * Публичный профиль пользователя (для GET /user/:id без авторизации)
 */
export interface IUserPublicProfile {
  id: string;
  username: string;
  avatarUrl: string | null;
  role: UserRole;
  createdAt: Date;
  steamProfileUrl: string | null;
  favoriteCase: {
    id: string;
    name: string;
    slug: string;
    imageUrl: string;
    openingsCount: number; // Сколько раз пользователь открыл этот кейс
  } | null;
  bestDrop: {
    id: string;
    displayName: string;
    imageUrl: string;
    weaponName: string | null;
    skinName: string | null;
    categoryName: string | null;
    price: number;
    rarity: string;
  } | null;
  inventory: IUserItem[]; // Максимум 21 предмет
  totalItems: number; // Общее количество предметов в инвентаре
  hasMore: boolean; // Есть ли ещё предметы для подгрузки
}

/**
 * Расширенный профиль (если пользователь запрашивает СВОЙ профиль с JWT)
 */
export interface IUserExtendedProfile extends IUserPublicProfile {
  balance: number; // Дополнительно для своего профиля
  tradeUrl: string | null; // Дополнительно для своего профиля
  isBlocked: boolean; // Дополнительно для своего профиля
}

/**
 * Входные данные для обновления trade URL
 */
export interface IUpdateTradeUrlInput {
  tradeUrl: string;
}
