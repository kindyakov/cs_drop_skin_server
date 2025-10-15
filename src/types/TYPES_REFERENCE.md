# Types Reference

## 📋 Описание
Справочник типов проекта с описанием констант и интерфейсов в папке `src/types/`.

---

## 🏷️ Constants (`constants.ts`)

### Роли пользователей
- **`UserRoles`** - Константы ролей
  ```typescript
  {
    USER: 'USER',
    ADMIN: 'ADMIN',
  } as const
  ```
- **`UserRole`** - Тип ролей: `'USER' | 'ADMIN'`

### Типы транзакций
- **`TransactionTypes`** - Константы типов транзакций
  ```typescript
  {
    DEPOSIT: 'DEPOSIT',
    WITHDRAWAL: 'WITHDRAWAL',
  } as const
  ```
- **`TransactionType`** - Типы транзакций: `'DEPOSIT' | 'WITHDRAWAL'`

### Статусы транзакций
- **`TransactionStatuses`** - Константы статусов транзакций
  ```typescript
  {
    PENDING: 'PENDING',
    COMPLETED: 'COMPLETED',
    FAILED: 'FAILED',
  } as const
  ```
- **`TransactionStatus`** - Статусы транзакций: `'PENDING' | 'COMPLETED' | 'FAILED'`

### Редкость предметов
- **`ItemRarities`** - Константы редкости предметов
  ```typescript
  {
    CONSUMER: 'CONSUMER',
    INDUSTRIAL: 'INDUSTRIAL',
    MIL_SPEC: 'MIL_SPEC',
    RESTRICTED: 'RESTRICTED',
    CLASSIFIED: 'CLASSIFIED',
    COVERT: 'COVERT',
    KNIFE: 'KNIFE',
  } as const
  ```
- **`ItemRarity`** - Типы редкости: `'CONSUMER' | 'INDUSTRIAL' | 'MIL_SPEC' | 'RESTRICTED' | 'CLASSIFIED' | 'COVERT' | 'KNIFE'`

### Статусы предметов в инвентаре
- **`ItemStatuses`** - Константы статусов предметов
  ```typescript
  {
    OWNED: 'OWNED',
    WITHDRAWN: 'WITHDRAWN',
  } as const
  ```
- **`ItemStatus`** - Статусы предметов: `'OWNED' | 'WITHDRAWN'`

---

## 👤 User Types (`user.types.ts`)

### Интерфейсы пользователей
- **`IUser`** - Полный интерфейс пользователя (из Prisma)
  ```typescript
  {
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
  ```

- **`IUserProfile`** - Публичный профиль пользователя
  ```typescript
  {
    id: string;
    username: string;
    avatarUrl: string | null;
    balance: number;
    role: UserRole;
    createdAt: Date;
  }
  ```

- **`IAuthResponse`** - Ответ авторизации
  ```typescript
  {
    token: string;
    user: IUserProfile;
  }
  ```

---

## 🎮 Case Types (`case.types.ts`)

### Кейсы
- **`ICase`** - Базовый интерфейс кейса
  ```typescript
  {
    id: string;
    name: string;
    slug: string;
    description: string | null;
    imageUrl: string;
    price: number; // в копейках
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
  }
  ```

- **`ICaseWithItems`** - Кейс с предметами
  ```typescript
  extends ICase {
    items: ICaseItemWithDetails[];
  }
  ```

- **`ICaseItemWithDetails`** - Связь кейс-предмет с деталями
  ```typescript
  {
    id: string;
    chancePercent: number;
    item: IItem;
  }
  ```

---

## 🗃️ Item Types (`item.types.ts`)

### Предметы
- **`IItem`** - Базовый интерфейс предмета
  ```typescript
  {
    id: string;
    marketHashName: string;
    displayName: string;
    imageUrl: string;
    price: number; // в копейках
    rarity: ItemRarity;
    createdAt: Date;
    updatedAt: Date;
  }
  ```

- **`IUserItem`** - Предмет в инвентаре пользователя
  ```typescript
  {
    id: string;
    userId: string;
    itemId: string;
    acquiredAt: Date;
    status: ItemStatus;
    item: IItem;
  }
  ```

---

## 🎯 Case Opening Types (`caseOpening.types.ts`)

### Открытие кейсов
- **`ICaseOpening`** - История открытия кейсов
  ```typescript
  {
    id: string;
    userId: string;
    caseId: string;
    itemId: string;
    openedAt: Date;
  }
  ```

- **`ICaseOpeningResult`** - Результат открытия кейса
  ```typescript
  {
    success: boolean;
    item: IItem;
    newBalance: number;
  }
  ```

- **`ILiveFeedEvent`** - События для live-ленты
  ```typescript
  {
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
  ```

---

## 💳 Payment Types (`payment.types.ts`)

### Платежные константы

#### **Провайдеры платежей**
- **`PaymentProviders`** - Константы провайдеров
  ```typescript
  {
    YOOKASSA: 'YOOKASSA',
    // STRIPE: 'STRIPE', // future
    // PAYPAL: 'PAYPAL',  // future
  } as const
  ```
- **`PaymentProvider`** - Тип провайдера: `'YOOKASSA'`

#### **Методы оплаты**
- **`PaymentMethods`** - Константы методов оплаты
  ```typescript
  {
    BANK_CARD: 'BANK_CARD',
    YOO_MONEY: 'YOO_MONEY',
    SBERBANK: 'SBERBANK',
    QIWI: 'QIWI',
    WEBMONEY: 'WEBMONEY',
    SBP: 'SBP',
  } as const
  ```
- **`PaymentMethod`** - Тип метода: `'BANK_CARD' | 'YOO_MONEY' | 'SBERBANK' | 'QIWI' | 'WEBMONEY' | 'SBP'`

#### **Статусы платежей**
- **`PaymentStatuses`** - Константы статусов
  ```typescript
  {
    PENDING: 'PENDING',     // Ожидает оплаты
    PROCESSING: 'PROCESSING', // В обработке
    SUCCEEDED: 'SUCCEEDED',   // Успешно завершен
    CANCELED: 'CANCELED',     // Отменен
    REFUNDED: 'REFUNDED',     // Возвращен
    EXPIRED: 'EXPIRED',       // Просрочен
  } as const
  ```
- **`PaymentStatus`** - Тип статуса: `'PENDING' | 'PROCESSING' | 'SUCCEEDED' | 'CANCELED' | 'REFUNDED' | 'EXPIRED'`

#### **Валюты**
- **`Currencies`** - Константы валют
  ```typescript
  {
    RUB: 'RUB',
    USD: 'USD', // future
    EUR: 'EUR', // future
  } as const
  ```
- **`Currency`** - Тип валюты: `'RUB' | 'USD' | 'EUR'`

### Основные интерфейсы платежей

#### **`IPayment`** - Базовый интерфейс платежа
```typescript
{
  id: string;
  userId: string;
  provider: PaymentProvider;
  method: PaymentMethod;
  amount: number; // в копейках
  status: PaymentStatus;
  currency: Currency;
  providerPaymentId?: string; // ID платежа у провайдера
  description?: string;
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
  completedAt?: Date; // Дата завершения
}
```

#### **`ICreatePaymentRequest`** - Запрос на создание платежа
```typescript
{
  amount: number; // в копейках
  method: PaymentMethod;
  description?: string;
  returnUrl?: string; // URL для возврата
  metadata?: Record<string, any>;
}
```

#### **`ICreatePaymentResponse`** - Ответ при создании платежа
```typescript
{
  success: boolean;
  paymentId: string;
  confirmationUrl?: string; // URL для подтверждения
  message?: string;
}
```

#### **`ITopupRequest`** - Запрос на пополнение баланса
```typescript
{
  amount: number; // в копейках
  method: PaymentMethod;
  description?: string;
}
```

#### **`IBalanceTransaction`** - Транзакция баланса
```typescript
{
  id: string;
  userId: string;
  paymentId?: string;
  type: 'TOPUP' | 'WITHDRAWAL' | 'CASE_OPEN' | 'ADMIN_ADJUSTMENT';
  amount: number; // + пополнение, - списание
  balanceBefore: number;
  balanceAfter: number;
  description?: string;
  metadata?: Record<string, any>;
  createdAt: Date;
}
```

#### **`IPaymentFilters`** - Фильтры поиска платежей
```typescript
{
  userId?: string;
  status?: PaymentStatus;
  provider?: PaymentProvider;
  method?: PaymentMethod;
  dateFrom?: Date;
  dateTo?: Date;
  minAmount?: number;
  maxAmount?: number;
}
```

---

## 🔌 Express Types (`express.d.ts`)

### Расширение Request
- **`Express.Request.user`** - Добавлено свойство для аутентифицированного пользователя
  ```typescript
  {
    userId: string;
    role: UserRole;
  } | undefined
  ```

---

## 📦 Импорт типов

```typescript
// Все типы
import * as Types from './index.js';

// Константы и типы
import { UserRoles, UserRole, ItemRarities, ItemRarity, ItemStatuses, ItemStatus } from './constants.js';
import { IUser, IUserProfile, IAuthResponse } from './user.types.js';
import { ICase, ICaseWithItems, ICaseItemWithDetails } from './case.types.js';
import { IItem, IUserItem } from './item.types.js';
import { ICaseOpening, ICaseOpeningResult, ILiveFeedEvent } from './caseOpening.types.js';
import { 
  PaymentProviders, PaymentProvider, PaymentMethods, PaymentMethod, 
  PaymentStatuses, PaymentStatus, Currencies, Currency,
  IPayment, ICreatePaymentRequest, ICreatePaymentResponse,
  ITopupRequest, IBalanceTransaction, IPaymentFilters 
} from './payment.types.js';

// В коде
const userRole: UserRole = UserRoles.ADMIN;
const user: IUser = { /* ... */ };
const caseItem: ICase = { /* ... */ };
const item: IItem = { /* ... */ };
const caseOpening: ICaseOpening = { /* ... */ };
const payment: IPayment = { /* ... */ };
const paymentStatus: PaymentStatus = PaymentStatuses.PENDING;
const paymentMethod: PaymentMethod = PaymentMethods.BANK_CARD;
```
