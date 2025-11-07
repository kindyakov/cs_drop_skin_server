import { Server as HttpServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import { config } from './env.config.js';
import { logger } from '../middleware/logger.middleware.js';
import type { ILiveFeedEvent } from '../types/caseOpening.types.js';

let io: SocketIOServer | null = null;

// Кеш последних 20 открытий кейсов в памяти
let recentOpeningsCache: ILiveFeedEvent[] = [];

/**
 * Инициализация Socket.io сервера
 */
export const initializeSocket = (httpServer: HttpServer): SocketIOServer => {
  io = new SocketIOServer(httpServer, {
    cors: {
      origin: config.cors.origin,
      methods: ['GET', 'POST'],
      credentials: true,
    },
    // Настройки транспорта
    transports: ['websocket', 'polling'],
    // Таймауты
    pingTimeout: 60000,
    pingInterval: 25000,
  });

  // Обработка подключений
  io.on('connection', (socket) => {
    logger.info('WebSocket клиент подключился', {
      socketId: socket.id,
      transport: socket.conn.transport.name,
    });

    // Подключение к комнате live-feed
    socket.join('live-feed');

    // Отправляем текущее количество пользователей новому клиенту
    broadcastUserCount();

    // Обработчик запроса начальных данных (request-response pattern)
    socket.on('request-initial-feed', () => {
      socket.emit('initial-feed', recentOpeningsCache);
    });

    // Обработка отключения
    socket.on('disconnect', (reason) => {
      logger.info('WebSocket клиент отключился', {
        socketId: socket.id,
        reason,
      });
      // Отправляем обновленное количество после отключения
      broadcastUserCount();
    });

    // Обработка ошибок
    socket.on('error', (error) => {
      logger.error('WebSocket ошибка', {
        socketId: socket.id,
        error,
      });
    });
  });

  // Периодическая отправка количества онлайн пользователей (каждые 5 секунд)
  setInterval(() => {
    broadcastUserCount();
  }, 5000);

  logger.info('Socket.io сервер инициализирован');
  return io;
};

/**
 * Получить Socket.io инстанс
 */
export const getSocketIO = (): SocketIOServer => {
  if (!io) {
    throw new Error('Socket.io не инициализирован. Вызовите initializeSocket() сначала');
  }
  return io;
};

/**
 * Эмитировать событие открытия кейса в live-feed
 */
export const emitCaseOpening = (event: ILiveFeedEvent): void => {
  try {
    if (!io) {
      logger.warn('Socket.io не инициализирован, событие не отправлено');
      return;
    }

    // Добавляем событие в кеш
    addToRecentOpenings(event);

    // Отправляем всем подключенным клиентам
    io.to('live-feed').emit('case-opened', event);
  } catch (error) {
    logger.error('Ошибка эмиссии события открытия кейса', { error });
  }
};

/**
 * Отправить количество подключенных пользователей всем клиентам
 */
const broadcastUserCount = (): void => {
  try {
    if (!io) {
      return;
    }

    const userCount = io.sockets.sockets.size;
    io.emit('user-count', userCount);
  } catch (error) {
    logger.error('Ошибка отправки количества пользователей', { error });
  }
};

/**
 * Добавить событие в кеш последних открытий (максимум 20)
 */
const addToRecentOpenings = (event: ILiveFeedEvent): void => {
  // Добавляем в начало массива
  recentOpeningsCache.unshift(event);

  // Ограничиваем размер до 20 элементов
  if (recentOpeningsCache.length > 20) {
    recentOpeningsCache = recentOpeningsCache.slice(0, 20);
  }
};

/**
 * Установить начальные данные в кеш
 */
export const setInitialCache = (events: ILiveFeedEvent[]): void => {
  recentOpeningsCache = events.slice(0, 20);
  logger.info('Кеш инициализирован', { cacheSize: recentOpeningsCache.length });
};
