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
  username: string;
  userAvatar: string | null;
  caseName: string;
  caseImage: string;
  itemName: string;
  itemImage: string;
  itemRarity: string;
  openedAt: Date;
}
