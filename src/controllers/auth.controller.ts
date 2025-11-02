import type { Request, Response, NextFunction } from 'express';
import passport from '../config/passport.config.js';
import { generateToken } from '../utils/jwt.util.js';
import { successResponse } from '../utils/response.util.js';
import { PrismaClient } from '@prisma/client';
import { NotFoundError, AppError } from '../utils/errors.util.js';
import { type AuthenticatedRequest } from '../middleware/auth.middleware.js';
import { VKIDService } from '../services/vkid.service.js';
import { setAuthState, getAuthState } from '../utils/auth-state.util.js';
import { generateDeviceId } from '../utils/device.util.js';
import { config } from '../config/env.config.js';
import logger from '../middleware/logger.middleware.js';

const prisma = new PrismaClient();

export const steamAuth = passport.authenticate('steam');

export const steamCallback = [
  passport.authenticate('steam', { session: false, failureRedirect: '/auth/failure' }),
  (req: Request, res: Response) => {
    const user = req.user as any;
    const token = generateToken({ userId: user.userId, role: user.role });

    res.redirect(
      `${process.env.FRONTEND_URL || 'http://localhost:3000'}/auth/success?token=${token}`
    );
  },
];

// Legacy VK OAuth removed - replaced with VK ID OAuth 2.1 (see vkIdAuth and vkIdCallback below)

export const getCurrentUser = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.userId },
      select: {
        id: true,
        username: true,
        avatarUrl: true,
        balance: true,
        role: true,
        createdAt: true,
      },
    });

    if (!user) {
      throw new NotFoundError('Пользователь не найден');
    }

    successResponse(res, user);
  } catch (error) {
    next(error);
  }
};

// ================================
// VK ID OAuth 2.1 Controllers
// ================================

// Initialize VK ID service
const vkidService = new VKIDService(
  config.vk.appId,
  config.vk.appSecret,
  config.vk.callbackUrl
);

/**
 * Initiates VK ID OAuth 2.1 authentication flow
 * Generates PKCE parameters, state, and device_id, then redirects to VK ID
 */
export const vkIdAuth = async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    // Generate PKCE parameters
    const { codeVerifier, codeChallenge } = vkidService.generatePKCE();

    // Generate CSRF protection state
    const state = vkidService.generateState();

    // Generate unique device identifier
    const deviceId = generateDeviceId();

    // Store state, codeVerifier, and deviceId in temporary storage (10 min TTL)
    setAuthState(state, codeVerifier, deviceId);

    // Build authorization URL
    const authUrl = vkidService.getAuthorizationUrl(state, codeChallenge);

    logger.info('VK ID auth initiated', { state, deviceId });

    // Redirect user to VK ID authorization page
    res.redirect(authUrl);
  } catch (error) {
    logger.error('VK ID auth initiation error:', error);
    next(new AppError('Ошибка инициализации VK ID авторизации', 500));
  }
};

/**
 * Handles VK ID OAuth 2.1 callback
 * Validates state, exchanges code for token, creates/updates user, generates JWT
 */
export const vkIdCallback = async (
  req: Request,
  res: Response,
  _next: NextFunction
): Promise<void> => {
  try {
    const { code, state, device_id } = req.query;

    // Validate required query parameters
    if (!code || !state || !device_id) {
      logger.error('VK ID callback: missing parameters', { code, state, device_id });
      return res.redirect(`${config.frontend.url}/auth/error?message=missing_parameters`);
    }

    // Retrieve and validate stored auth state
    const authState = getAuthState(state as string);
    if (!authState) {
      logger.error('VK ID callback: invalid or expired state', { state });
      return res.redirect(`${config.frontend.url}/auth/error?message=invalid_state`);
    }

    // Note: VK ID generates its own device_id and ignores the one we send
    // We use the device_id returned by VK for token exchange
    // State validation already provides CSRF protection

    logger.info('VK ID callback: exchanging code for token', {
      vkDeviceId: device_id,
    });

    // Exchange authorization code for access token
    const tokenData = await vkidService.exchangeCodeForToken(
      code as string,
      device_id as string,
      authState.codeVerifier
    );

    logger.info('VK ID callback: getting user info');

    // Get user information from VK ID
    const userInfo = await vkidService.getUserInfo(tokenData.access_token);

    const vkId = userInfo.user.user_id;
    const firstName = userInfo.user.first_name;
    const lastName = userInfo.user.last_name;
    const avatar = userInfo.user.avatar;

    logger.info(`VK ID user authenticated: ${vkId}`, { firstName, lastName });

    // Find or create user in database
    let user = await prisma.user.findUnique({
      where: { vkId },
      select: { id: true, role: true, username: true, isBlocked: true },
    });

    if (!user) {
      // Create new user
      logger.info(`Creating new user for VK ID: ${vkId}`);
      user = await prisma.user.create({
        data: {
          vkId,
          username: `${firstName} ${lastName}`,
          avatarUrl: avatar || null,
          role: 'USER',
        },
        select: { id: true, role: true, username: true, isBlocked: true },
      });
    } else {
      // Check if user is blocked
      if (user.isBlocked) {
        logger.warn(`Blocked user attempted login: ${user.id}`);
        return res.redirect(`${config.frontend.url}/auth/error?message=user_blocked`);
      }

      // Update existing user profile
      logger.info(`Updating user profile for VK ID: ${vkId}`);
      user = await prisma.user.update({
        where: { vkId },
        data: {
          username: `${firstName} ${lastName}`,
          avatarUrl: avatar || null,
        },
        select: { id: true, role: true, username: true, isBlocked: true },
      });
    }

    logger.info(`User logged in: ${user.username} (${user.id})`);

    // Generate JWT token
    const token = generateToken({ userId: user.id, role: user.role });

    // Redirect to frontend with token
    res.redirect(`${config.frontend.url}/auth/success?token=${token}`);
  } catch (error) {
    logger.error('VK ID callback error:', error);
    res.redirect(`${config.frontend.url}/auth/error?message=authentication_failed`);
  }
};
