/**
 * VK ID OAuth 2.1 Service
 * Handles VK ID authentication flow with PKCE
 */

import crypto from 'crypto';
import axios from 'axios';
import logger from '../middleware/logger.middleware.js';
import { AppError } from '../utils/errors.util.js';

export interface VKIDTokenResponse {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
  user_id: number;
  state?: string;
}

export interface VKIDUserInfo {
  user: {
    user_id: string;
    first_name: string;
    last_name: string;
    avatar?: string;
    email?: string;
    phone?: string;
    sex?: number; // 1 - female, 2 - male
    verified?: boolean;
    birthday?: string; // Format: DD.MM.YYYY
  };
}

export class VKIDService {
  private clientId: string;
  private redirectUri: string;

  constructor(clientId: string, _clientSecret: string, redirectUri: string) {
    this.clientId = clientId;
    this.redirectUri = redirectUri;
  }

  // Генерация code_verifier и code_challenge для PKCE
  generatePKCE() {
    const codeVerifier = crypto.randomBytes(32).toString('base64url');
    const codeChallenge = crypto.createHash('sha256').update(codeVerifier).digest('base64url');

    return { codeVerifier, codeChallenge };
  }

  // Генерация state для защиты от CSRF
  generateState(): string {
    return crypto.randomBytes(16).toString('hex');
  }

  // Создание URL для авторизации
  getAuthorizationUrl(state: string, codeChallenge: string): string {
    const params = new URLSearchParams({
      response_type: 'code',
      client_id: this.clientId,
      redirect_uri: this.redirectUri,
      state: state,
      scope: 'email phone', // запрашиваемые права
      code_challenge: codeChallenge,
      code_challenge_method: 'S256',
    });

    return `https://id.vk.com/authorize?${params.toString()}`;
  }

  // Обмен authorization code на access token
  async exchangeCodeForToken(
    code: string,
    deviceId: string,
    codeVerifier: string
  ): Promise<VKIDTokenResponse> {
    try {
      const params = new URLSearchParams({
        grant_type: 'authorization_code',
        code: code,
        client_id: this.clientId,
        device_id: deviceId,
        redirect_uri: this.redirectUri,
        code_verifier: codeVerifier,
      });

      const response = await axios.post<VKIDTokenResponse>(
        'https://id.vk.com/oauth2/auth',
        params,
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        }
      );

      return response.data;
    } catch (error: any) {
      logger.error('VK ID token exchange error:', {
        error: error.response?.data || error.message,
        status: error.response?.status,
      });
      throw new AppError('Failed to exchange code for token', 500);
    }
  }

  // Получение информации о пользователе
  async getUserInfo(accessToken: string): Promise<VKIDUserInfo> {
    try {
      // VK ID requires client_id as query parameter along with Bearer token
      const url = `https://id.vk.com/oauth2/user_info?client_id=${this.clientId}`;

      const response = await axios.get<VKIDUserInfo>(url, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      return response.data;
    } catch (error: any) {
      logger.error('VK ID user info error:', {
        error: error.response?.data || error.message,
        status: error.response?.status,
      });
      throw new AppError('Failed to get user info', 500);
    }
  }
}
