import { UserRole } from './constants';

// Базовый интерфейс пользователя (из Prisma)
export interface IUser {
  id: string;
  steamId: string | null;
  vkId: string | null;
  username: string;
  avatarUrl: string | null;
  balance: number;
  role: UserRole;
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
  createdAt: Date;
}

// Ответ при авторизации
export interface IAuthResponse {
  token: string;
  user: IUserProfile;
}
