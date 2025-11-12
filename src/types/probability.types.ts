import { ItemRarity } from '@prisma/client';
import { IAddItemError } from './admin.types';

// ==============================================
// PROBABILITY CALCULATION
// ==============================================

/**
 * Алгоритмы расчета вероятностей
 * - price: На основе цены (обратная пропорция - дешевые скины = высокий шанс)
 * - rarity: На основе редкости (фиксированные шансы для каждой редкости)
 * - combined: Комбинированный (базовый шанс по редкости + корректировка по цене внутри тира)
 */
export type ProbabilityAlgorithm = 'price' | 'rarity' | 'combined';

/**
 * Опции для расчета вероятностей
 */
export interface IProbabilityCalculationOptions {
  minChance?: number; // Минимальный шанс выпадения в % (по умолчанию 0.1)
  maxChance?: number; // Максимальный шанс выпадения в % (по умолчанию 50)
}

/**
 * Входные данные для расчета вероятностей
 * Используется эндпоинтом POST /api/v1/admin/cases/calculate-probabilities
 */
export interface ICalculateProbabilitiesInput {
  marketHashNames: string[]; // Массив названий скинов (1-50 элементов)
  algorithm: ProbabilityAlgorithm; // Алгоритм расчета
  options?: IProbabilityCalculationOptions; // Опциональные настройки
}

/**
 * Рассчитанная вероятность для одного скина
 * Содержит все данные скина + рассчитанный шанс выпадения
 */
export interface ICalculatedSkinProbability {
  marketHashName: string; // Полное название скина
  displayName: string; // Отображаемое название (без состояния)
  weaponName: string; // Название оружия (например: "AK-47")
  skinName: string; // Название скина (например: "Redline")
  quality: string; // Качество (например: "Field-Tested")
  price: number; // Цена в копейках
  rarity: ItemRarity; // Редкость (CONSUMER, INDUSTRIAL, etc.)
  imageUrl: string; // URL изображения
  calculatedChance: number; // Рассчитанная вероятность в % (0.01 - 100)
  existsInDatabase: boolean; // true если скин уже есть в БД
}

/**
 * Результат расчета вероятностей
 * Возвращается эндпоинтом calculate-probabilities
 */
export interface ICalculateProbabilitiesOutput {
  items: ICalculatedSkinProbability[]; // Скины с рассчитанными вероятностями
  totalChance: number; // Сумма всех вероятностей (должна быть ≤ 100)
  algorithm: ProbabilityAlgorithm; // Использованный алгоритм
  warnings?: IAddItemError[]; // Предупреждения (скины не найдены, ошибки API)
}

/**
 * Внутренний тип для хранения данных скина во время обработки
 */
export interface ISkinDataForCalculation {
  marketHashName: string;
  displayName: string;
  weaponName: string;
  skinName: string;
  quality: string;
  price: number;
  rarity: ItemRarity;
  imageUrl: string;
  existsInDatabase: boolean;
}

/**
 * Конфигурация для алгоритма расчета по редкости
 * Задает базовые шансы для каждого уровня редкости
 */
export interface IRarityBasedConfig {
  [key: string]: number; // ItemRarity -> base chance %
}

/**
 * Дефолтная конфигурация шансов по редкости
 * Основана на реальном распределении в CS:GO кейсах
 */
export const DEFAULT_RARITY_CHANCES: IRarityBasedConfig = {
  CONSUMER: 79.92, // Consumer Grade (Белый) - самые частые
  INDUSTRIAL: 15.98, // Industrial Grade (Голубой)
  MIL_SPEC: 3.2, // Mil-Spec Grade (Синий)
  RESTRICTED: 0.64, // Restricted (Фиолетовый)
  CLASSIFIED: 0.13, // Classified (Розовый)
  COVERT: 0.026, // Covert (Красный)
  KNIFE: 0.026, // Knife (Золотой) - редчайший
};

/**
 * Конфигурация для комбинированного алгоритма
 * Комбинирует базовые шансы по редкости + распределение по цене внутри тира
 */
export interface ICombinedAlgorithmConfig {
  rarityChances: IRarityBasedConfig; // Базовые шансы по редкости
  priceWeightFactor: number; // Множитель для веса цены (0.5 = меньше влияние цены)
}
