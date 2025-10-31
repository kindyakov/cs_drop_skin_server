import passport from 'passport';
import { Strategy as SteamStrategy } from 'passport-steam';
import { Strategy as VKontakteStrategy } from 'passport-vkontakte';
import { PrismaClient } from '@prisma/client';
import { config } from './env.config.js';
import logger from '../middleware/logger.middleware.js';

const prisma = new PrismaClient();

passport.use(
  new SteamStrategy(
    {
      returnURL: config.steam.returnUrl,
      realm: `https://cs-drop-skin-server.onrender.com`, // https://permanently-jaunty-murrelet.cloudpub.ru/
      apiKey: config.steam.apiKey,
    },
    async (identifier, profile, done) => {
      try {
        // Извлекаем steamId из identifier (последняя часть URL)
        const steamId = identifier.split('/').pop() || '';

        logger.info(`Steam OAuth attempt for steamId: ${steamId}`);

        // Ищем пользователя в базе данных
        let user = await prisma.user.findUnique({
          where: { steamId },
        });

        if (user) {
          logger.info(`Existing user found: ${user.username} (id: ${user.id})`);
          return done(null, { userId: user.id, role: user.role });
        }

        // Если пользователя нет, создаем нового
        logger.info(`Creating new user for steamId: ${steamId}`);
        user = await prisma.user.create({
          data: {
            steamId,
            username: profile.displayName,
            avatarUrl: profile.photos[2]?.value || null,
            role: 'USER',
          },
        });

        logger.info(`New user created: ${user.username} (id: ${user.id})`);
        return done(null, { userId: user.id, role: user.role });
      } catch (error) {
        logger.error('Steam OAuth error:', error);
        return done(error, undefined);
      }
    }
  )
);

passport.use(
  new VKontakteStrategy(
    {
      clientID: config.vk.appId,
      clientSecret: config.vk.appSecret,
      callbackURL: config.vk.callbackUrl,
    },
    async (_accessToken: any, _refreshToken: any, _params: any, profile: any, done: any) => {
      try {
        const vkId = profile.id;

        logger.info(`VK OAuth attempt for vkId: ${vkId}`);

        // Ищем пользователя в базе данных
        let user = await prisma.user.findUnique({
          where: { vkId },
        });

        if (user) {
          logger.info(`Existing user found: ${user.username} (${user.id})`);
          return done(null, { userId: user.id, role: user.role });
        }

        // Если пользователя нет, создаем нового
        logger.info(`Creating new user for vkId: ${vkId}`);
        user = await prisma.user.create({
          data: {
            vkId,
            username: profile.displayName,
            avatarUrl: profile.photos?.[0]?.value || null,
            role: 'USER',
          },
        });

        logger.info(`New user created: ${user.username} (${user.id})`);
        return done(null, { userId: user.id, role: user.role });
      } catch (error) {
        logger.error('VK OAuth error:', error);
        return done(error, undefined);
      }
    }
  )
);

passport.serializeUser((user: any, done) => {
  done(null, user.id);
});

passport.deserializeUser(async (id: string, done) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id },
    });

    if (!user) {
      return done(new Error('User not found'), undefined);
    }

    done(null, { userId: user.id, role: user.role });
  } catch (error) {
    logger.error('Deserialize user error:', error);
    return done(error, undefined);
  }
});

export default passport;
