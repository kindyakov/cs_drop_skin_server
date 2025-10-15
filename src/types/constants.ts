// Роли пользователей
export const UserRoles = {
  USER: 'USER',
  ADMIN: 'ADMIN',
} as const;
export type UserRole = typeof UserRoles[keyof typeof UserRoles];

// Типы транзакций
export const TransactionTypes = {
  DEPOSIT: 'DEPOSIT',
  WITHDRAWAL: 'WITHDRAWAL',
} as const;
export type TransactionType = typeof TransactionTypes[keyof typeof TransactionTypes];

// Статусы транзакций
export const TransactionStatuses = {
  PENDING: 'PENDING',
  COMPLETED: 'COMPLETED',
  FAILED: 'FAILED',
} as const;
export type TransactionStatus = typeof TransactionStatuses[keyof typeof TransactionStatuses];

// Редкость предметов
export const ItemRarities = {
  CONSUMER: 'CONSUMER',
  INDUSTRIAL: 'INDUSTRIAL',
  MIL_SPEC: 'MIL_SPEC',
  RESTRICTED: 'RESTRICTED',
  CLASSIFIED: 'CLASSIFIED',
  COVERT: 'COVERT',
  KNIFE: 'KNIFE',
} as const;
export type ItemRarity = typeof ItemRarities[keyof typeof ItemRarities];

// Статусы предметов в инвентаре
export const ItemStatuses = {
  OWNED: 'OWNED',
  WITHDRAWN: 'WITHDRAWN',
} as const;
export type ItemStatus = typeof ItemStatuses[keyof typeof ItemStatuses];
