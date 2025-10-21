/**
 * WebSocket типы и события для CS:GO Case Opening Platform
 */

import type { ILiveFeedEvent } from './caseOpening.types.js';

// ==============================================
// SOCKET EVENTS
// ==============================================

/**
 * События от сервера к клиенту
 */
export interface ServerToClientEvents {
  'case-opened': (event: ILiveFeedEvent) => void;
  'user-count': (count: number) => void;
  'error': (message: string) => void;
}

/**
 * События от клиента к серверу
 */
export interface ClientToServerEvents {
  'join-feed': () => void;
  'leave-feed': () => void;
}

/**
 * Данные сокета (межсерверные события)
 */
export interface InterServerEvents {
  ping: () => void;
}

/**
 * Данные сокета
 */
export interface SocketData {
  userId?: string;
  username?: string;
}
