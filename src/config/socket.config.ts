import { Server as HttpServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import { config } from './env.config.js';
import { logger } from '../middleware/logger.middleware.js';

let io: SocketIOServer | null = null;

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
export const emitCaseOpening = (event: any): void => {
  try {
    if (!io) {
      logger.warn('Socket.io не инициализирован, событие не отправлено');
      return;
    }

    io.to('live-feed').emit('case-opened', event);

    logger.debug('Событие открытия кейса отправлено', {
      eventId: event.id,
      caseName: event.caseName,
    });
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
