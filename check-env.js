#!/usr/bin/env node

/**
 * Railway Environment Variables Checker
 * Проверяет наличие всех обязательных переменных для деплоя
 */

const requiredVars = [
  'NODE_ENV',
  'DATABASE_URL',
  'JWT_SECRET',
  'JWT_EXPIRES_IN',
  'STEAM_API_KEY',
  'STEAM_RETURN_URL',
  'VK_APP_ID',
  'VK_APP_SECRET',
  'VK_CALLBACK_URL',
  'FRONTEND_URL',
  'CORS_ORIGIN',
  'YOOKASSA_SHOP_ID',
  'YOOKASSA_SECRET_KEY',
  'MARKET_CS_API_KEY',
  'RATE_LIMIT_WINDOW_MS',
  'RATE_LIMIT_MAX_REQUESTS',
  'NAME_CACHE_FILE',
  'LOG_LEVEL',
];

const warningVars = {
  JWT_SECRET: {
    check: (val) => val && val.length >= 32 && !val.includes('your-super-secret'),
    message: '⚠️  JWT_SECRET должен быть криптостойким (минимум 32 символа) и НЕ содержать "your-super-secret"',
  },
  NODE_ENV: {
    check: (val) => val === 'production',
    message: '⚠️  NODE_ENV должен быть "production" для Railway',
  },
  YOOKASSA_SHOP_ID: {
    check: (val) => val && !val.includes('dummy'),
    message: '⚠️  YOOKASSA_SHOP_ID содержит "dummy" - используйте реальные ключи для продакшена',
  },
  YOOKASSA_SECRET_KEY: {
    check: (val) => val && !val.includes('dummy'),
    message: '⚠️  YOOKASSA_SECRET_KEY содержит "dummy" - используйте реальные ключи для продакшена',
  },
  VK_APP_SECRET: {
    check: (val) => val && !val.includes('dummy'),
    message: '⚠️  VK_APP_SECRET содержит "dummy" - используйте реальные ключи если нужна авторизация через VK',
  },
};

console.log('🔍 Проверка переменных окружения для Railway...\n');

let hasErrors = false;
let hasWarnings = false;

// Проверка обязательных переменных
requiredVars.forEach((varName) => {
  if (!process.env[varName]) {
    console.error(`❌ ${varName} - ОТСУТСТВУЕТ`);
    hasErrors = true;
  } else {
    console.log(`✅ ${varName}`);
    
    // Проверка предупреждений
    if (warningVars[varName]) {
      const { check, message } = warningVars[varName];
      if (!check(process.env[varName])) {
        console.log(`   ${message}`);
        hasWarnings = true;
      }
    }
  }
});

console.log('\n' + '='.repeat(60));

if (hasErrors) {
  console.error('\n❌ ОШИБКА: Не все обязательные переменные настроены!');
  console.error('Добавьте отсутствующие переменные в Railway Variables.\n');
  process.exit(1);
}

if (hasWarnings) {
  console.warn('\n⚠️  ПРЕДУПРЕЖДЕНИЕ: Некоторые переменные требуют внимания!');
  console.warn('Для продакшена рекомендуется исправить эти значения.\n');
}

if (!hasErrors && !hasWarnings) {
  console.log('\n✅ Все переменные окружения настроены правильно!');
  console.log('Готово к деплою на Railway.\n');
}

process.exit(0);
