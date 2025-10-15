/**
 * Карта транс литерации русских букв
 */
const transliterationMap: { [key: string]: string } = {
  'а': 'a', 'б': 'b', 'в': 'v', 'г': 'g', 'д': 'd', 'е': 'e', 'ё': 'yo', 'ж': 'zh',
  'з': 'z', 'и': 'i', 'й': 'y', 'к': 'k', 'л': 'l', 'м': 'm', 'н': 'n', 'о': 'o',
  'п': 'p', 'р': 'r', 'с': 's', 'т': 't', 'у': 'u', 'ф': 'f', 'х': 'h', 'ц': 'ts',
  'ч': 'ch', 'ш': 'sh', 'щ': 'sch', 'ъ': '', 'ы': 'y', 'ь': '', 'э': 'e', 'ю': 'yu',
  'я': 'ya',
  'А': 'A', 'Б': 'B', 'В': 'V', 'Г': 'G', 'Д': 'D', 'Е': 'E', 'Ё': 'Yo', 'Ж': 'Zh',
  'З': 'Z', 'И': 'I', 'Й': 'Y', 'К': 'K', 'Л': 'L', 'М': 'M', 'Н': 'N', 'О': 'O',
  'П': 'P', 'Р': 'R', 'С': 'S', 'Т': 'T', 'У': 'U', 'Ф': 'F', 'Х': 'H', 'Ц': 'Ts',
  'Ч': 'Ch', 'Ш': 'Sh', 'Щ': 'Sch', 'Ъ': '', 'Ы': 'Y', 'Ь': '', 'Э': 'E', 'Ю': 'Yu',
  'Я': 'Ya'
};

/**
 * Преобразует текст в slug
 */
export const slugify = (text: string): string => {
  if (!text || typeof text !== 'string') {
    return '';
  }

  // Транслитерируем русские буквы
  let result = text.replace(/[А-Яа-яЁё]/g, (match) => transliterationMap[match] || match);

  // Заменяем пробелы и специальные символы на дефисы
  result = result.replace(/[^\w\s-]/g, '-');
  result = result.replace(/\s+/g, '-');

  // Удаляем множественные дефисы
  result = result.replace(/-+/g, '-');

  // Удаляем дефисы в начале и конце
  result = result.replace(/^-|-$/g, '');

  return result.toLowerCase();
};

/**
 * Форматирует цену из копеек в рубли
 */
export const formatPrice = (kopecks: number): string => {
  if (typeof kopecks !== 'number' || isNaN(kopecks)) {
    return '0.00 ₽';
  }

  const rubles = kopecks / 100;
  return `${rubles.toFixed(2)} ₽`;
};

/**
 * Создает задержку выполнения
 */
export const sleep = (ms: number): Promise<void> => {
  return new Promise((resolve) => setTimeout(resolve, ms));
};
