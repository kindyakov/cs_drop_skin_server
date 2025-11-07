import { IItem } from './item.types';

// История открытия
export interface ICaseOpening {
  id: string;
  userId: string;
  caseId: string;
  itemId: string;
  openedAt: Date;
}

// Результат открытия кейса
export interface ICaseOpeningResult {
  success: boolean;
  item: IItem;
  newBalance: number;
}

// События для live-ленты
export interface ILiveFeedEvent {
  id: string;
  userId: string;
  username: string;
  userAvatar: string | null;
  skinName: string | null;
  weaponName: string | null;
  imageUrl: string;
  rarity: string;
  displayName: string;
  caseName: string;
  caseSlug: string;
  caseImageUrl: string;
  openedAt: Date;
}
