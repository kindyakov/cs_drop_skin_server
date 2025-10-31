import { z } from 'zod';
import dotenv from 'dotenv';

// Загрузка переменных окружения из .env файла (только для локальной разработки)
// Railway автоматически добавляет переменные в process.env
if (process.env.NODE_ENV !== 'production') {
  dotenv.config();
}

// Environment variables schema with validation
const envSchema = z.object({
  // ================================
  // BASIC SERVER CONFIGURATION
  // ================================
  NODE_ENV: z.enum(['development', 'production', 'test'], {
    errorMap: () => ({ message: 'NODE_ENV must be one of: development, production, test' }),
  }),
  PORT: z.string().transform(Number).pipe(z.number().min(1).max(65535)).default('5000'),

  // ================================
  // DATABASE
  // ================================
  DATABASE_URL: z
    .string({
      required_error:
        'DATABASE_URL is required. Format: postgresql://username:password@host:port/database',
    })
    .url(),

  // ================================
  // JWT AUTHENTICATION
  // ================================
  JWT_SECRET: z
    .string({
      required_error: 'JWT_SECRET is required for token generation',
    })
    .min(32, { message: 'JWT_SECRET must be at least 32 characters long' }),
  JWT_EXPIRES_IN: z.string().default('2h'),

  // ================================
  // STEAM OAUTH PROVIDER
  // ================================
  STEAM_API_KEY: z
    .string({
      required_error: 'STEAM_API_KEY is required for Steam OAuth',
    })
    .min(1),
  STEAM_RETURN_URL: z
    .string({
      required_error: 'STEAM_RETURN_URL is required for Steam OAuth callback',
    })
    .url(),

  // ================================
  // VK OAUTH PROVIDER
  // ================================
  VK_APP_ID: z
    .string({
      required_error: 'VK_APP_ID is required for VkOAuth',
    })
    .min(1),
  VK_APP_SECRET: z
    .string({
      required_error: 'VK_APP_SECRET is required for VkOAuth',
    })
    .min(1),
  VK_CALLBACK_URL: z
    .string({
      required_error: 'VK_CALLBACK_URL is required for VK OAuth callback',
    })
    .url(),

  // ================================
  // EXTERNAL SERVICES
  // ================================
  MARKET_CS_API_KEY: z
    .string({
      required_error: 'MARKET_CS_API_KEY is required for market.csgo.com API',
    })
    .min(1),
  YOOKASSA_SHOP_ID: z
    .string({
      required_error: 'YOOKASSA_SHOP_ID is required for YooKassa payment gateway',
    })
    .min(1),
  YOOKASSA_SECRET_KEY: z
    .string({
      required_error: 'YOOKASSA_SECRET_KEY is required for YooKassa payment gateway',
    })
    .min(1),

  // ================================
  // CORS & SECURITY
  // ================================
  CORS_ORIGIN: z.string().default('*'),

  // ================================
  // RATE LIMITING
  // ================================
  RATE_LIMIT_WINDOW_MS: z.string().transform(Number).pipe(z.number().min(1000)).default('60000'),
  RATE_LIMIT_MAX_REQUESTS: z.string().transform(Number).pipe(z.number().min(1)).default('100'),

  // ================================
  // LOGGING
  // ================================
  LOG_LEVEL: z
    .enum(['error', 'warn', 'info', 'debug'], {
      errorMap: () => ({ message: 'LOG_LEVEL must be one of: error, warn, info, debug' }),
    })
    .default('info'),

  NAME_CACHE_FILE: z
    .string({
      required_error: 'NAME_CACHE_FILE is required for file cache with skins',
    })
    .min(6, 'Filename must be at least 6 characters long')
    .refine((val) => val.endsWith('.json'), {
      message: 'Cache file must have .json extension',
    })
    .default('skins-cache.json'),
});

// Validate and parse environment variables
let validatedEnv: z.infer<typeof envSchema>;

try {
  validatedEnv = envSchema.parse(process.env);
} catch (error) {
  if (error instanceof z.ZodError) {
    const errorMessages = error.errors.map((err) => `${err.path.join('.')}: ${err.message}`);
    throw new Error(`❌ Invalid environment variables:\n${errorMessages.join('\n')}`);
  }
  throw error;
}

// Export typed configuration object
export const config = {
  // Server
  nodeEnv: validatedEnv.NODE_ENV,
  port: validatedEnv.PORT,

  // Database
  database: {
    url: validatedEnv.DATABASE_URL,
  },

  // JWT
  jwt: {
    secret: validatedEnv.JWT_SECRET,
    expiresIn: validatedEnv.JWT_EXPIRES_IN,
  },

  // OAuth providers
  steam: {
    apiKey: validatedEnv.STEAM_API_KEY,
    returnUrl: validatedEnv.STEAM_RETURN_URL,
  },

  vk: {
    appId: validatedEnv.VK_APP_ID,
    appSecret: validatedEnv.VK_APP_SECRET,
    callbackUrl: validatedEnv.VK_CALLBACK_URL,
  },

  // External services
  marketCs: {
    apiKey: validatedEnv.MARKET_CS_API_KEY,
  },

  yookassa: {
    shopId: validatedEnv.YOOKASSA_SHOP_ID,
    secretKey: validatedEnv.YOOKASSA_SECRET_KEY,
  },

  // Security & middleware
  cors: {
    origin: validatedEnv.CORS_ORIGIN,
  },

  // Rate limiting
  rateLimit: {
    windowMs: validatedEnv.RATE_LIMIT_WINDOW_MS,
    maxRequests: validatedEnv.RATE_LIMIT_MAX_REQUESTS,
  },

  // Logging
  logging: {
    level: validatedEnv.LOG_LEVEL,
  },

  cacheFile: validatedEnv.NAME_CACHE_FILE,

  // Environment check helpers
  isDevelopment: validatedEnv.NODE_ENV === 'development',
  isProduction: validatedEnv.NODE_ENV === 'production',
  isTest: validatedEnv.NODE_ENV === 'test',
} as const;

// Export types (optional, if needed elsewhere)
export type Config = typeof config;
export type EnvSchema = z.infer<typeof envSchema>;
