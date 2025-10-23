# CS:GO API Service - Quick Start

## Описание

Сервис для получения и кэширования данных о CS:GO скинах из [ByMykel/CSGO-API](https://github.com/ByMykel/CSGO-API).

## Быстрый старт

```typescript
import { csApiService } from './services/csApi.service.js';

// 1. Синхронизация данных с API
const result = await csApiService.syncSkinsCache();
console.log(`✅ Загружено ${result.totalSkins} скинов за ${result.duration}мс`);

// 2. Получение данных из кэша
const skins = await csApiService.getSkinsFromCache();
console.log(`📦 Найдено ${skins.length} скинов в кэше`);

// 3. Проверка состояния кэша
const info = await csApiService.getCacheInfo();
console.log(`ℹ️ Последняя синхронизация: ${info.lastSync}`);
```

## Основные методы

### `syncSkinsCache()`

Загружает данные из API и сохраняет в локальный кэш.

**Возвращает:**
```typescript
{
  lastSync: string;      // ISO 8601 timestamp
  totalSkins: number;    // Количество скинов
  duration: number;      // Время выполнения в мс
}
```

### `getSkinsFromCache()`

Получает скины из локального кэша (быстро, без запроса к API).

**Возвращает:** `CSApiSkin[]` - массив скинов

### `getCacheInfo()`

Возвращает метаданные о состоянии кэша.

**Возвращает:**
```typescript
{
  lastSync: string | null;  // Время последней синхронизации
  totalSkins: number;        // Количество скинов
  cacheExists: boolean;      // Существует ли кэш
}
```

## Структура данных скина

```typescript
interface CSApiSkin {
  id: string;
  name: string;                    // "★ Обмотки рук | Пиксельный камуфляж «Хвоя»"
  description: string;
  weapon: {
    id: string;                    // "leather_handwraps"
    name: string;                  // "Обмотки рук"
  };
  category: {
    id: string;
    name: string;                  // "Перчатки"
  };
  pattern: {
    id: string;
    name: string;                  // "Пиксельный камуфляж «Хвоя»"
  };
  min_float: number;               // 0.06
  max_float: number;               // 0.8
  rarity: {
    id: string;
    name: string;                  // "экстраординарного типа"
    color: string;                 // "#eb4b4b"
  };
  stattrak: boolean;
  souvenir: boolean;
  paint_index: string;
  market_hash_name: string | null; // "★ Hand Wraps | Spruce DDPAT (Factory New)"
  image: string;                   // URL изображения
  wears: Array<{
    id: string;
    name: string;                  // "Прямо с завода", "Немного поношенное"
  }>;
}
```

## Примеры использования

### Поиск скинов по фильтрам

```typescript
const skins = await csApiService.getSkinsFromCache();

// Поиск по оружию
const ak47Skins = skins.filter(skin => skin.weapon.id === 'ak47');

// Поиск по редкости
const covertSkins = skins.filter(skin => skin.rarity.id === 'rarity_ancient_weapon');

// Поиск с StatTrak
const stattrakSkins = skins.filter(skin => skin.stattrak === true);

// Поиск по названию паттерна
const asiiSkins = skins.filter(skin => skin.pattern.name.includes('Asiimov'));
```

### Проверка актуальности кэша

```typescript
const info = await csApiService.getCacheInfo();

if (!info.cacheExists) {
  console.log('Кэш не найден, выполняем первую синхронизацию...');
  await csApiService.syncSkinsCache();
} else {
  const lastSync = new Date(info.lastSync);
  const hoursSinceSync = (Date.now() - lastSync.getTime()) / (1000 * 60 * 60);

  if (hoursSinceSync > 24) {
    console.log('Кэш устарел (>24 часов), обновляем...');
    await csApiService.syncSkinsCache();
  } else {
    console.log(`Кэш актуален (обновлен ${hoursSinceSync.toFixed(1)} часов назад)`);
  }
}
```

### Интеграция с cron job

```typescript
import cron from 'node-cron';
import { csApiService } from './services/csApi.service.js';
import { logger } from './middleware/logger.middleware.js';

// Синхронизация каждый день в 3:00 ночи
cron.schedule('0 3 * * *', async () => {
  try {
    logger.info('Starting scheduled CSGO skins sync');
    const result = await csApiService.syncSkinsCache();
    logger.info('Scheduled sync completed', result);
  } catch (error) {
    logger.error('Scheduled sync failed', { error });
  }
});
```

## Технические детали

### Источник данных

- **URL:** `https://raw.githubusercontent.com/ByMykel/CSGO-API/main/public/api/ru/skins_not_grouped.json`
- **Формат:** JSON массив
- **Количество скинов:** ~15,000+
- **Язык:** Русский (ru)
- **Timeout:** 30 секунд

### Кэш

- **Путь:** `server/data/skins-cache.json`
- **Размер:** ~35 MB
- **Формат:** JSON с форматированием
- **Gitignore:** Кэш не коммитится
- **Атомарность:** Используется временный файл для безопасной записи

### Производительность

- Синхронизация: 4-5 секунд
- Чтение из кэша: <100 мс
- Размер памяти: ~35 MB для массива скинов

### Обработка ошибок

Все методы логируют ошибки через Winston logger:

- **HTTP timeout** → Error: "API request timeout after 30000ms"
- **HTTP ошибка** → Error: "API request failed with status XXX"
- **Ошибка чтения** → Возвращает пустой массив + warning в логах
- **Ошибка записи** → Error: "Failed to write cache file"

## Тестирование

Создан тестовый скрипт `server/test-csapi.ts`:

```bash
cd server
npx tsx test-csapi.ts
```

Тест выполняет:
1. Проверку состояния кэша
2. Синхронизацию с API
3. Чтение из кэша
4. Вывод примеров скинов

## Логирование

Сервис использует Winston logger для детального логирования:

```
19:47:21 info: Starting skins cache synchronization
19:47:25 info: Successfully fetched skins from API { totalSkins: 15339 }
19:47:25 info: Cache synchronization completed successfully { duration: "4272ms" }
```

## API Reference

Полная документация в `server/src/services/SERVICES_REFERENCE.md`

## Roadmap

- [ ] Добавить метод фильтрации скинов по параметрам
- [ ] Реализовать пагинацию для больших выборок
- [ ] Добавить поиск по market_hash_name
- [ ] Интеграция с Prisma для сохранения в БД (опционально)
- [ ] Добавить кэширование в Redis (для production)

## Лицензия

ISC
