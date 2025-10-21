# WebSocket API Documentation

## Обзор

CS:GO Case Opening Platform использует Socket.io для real-time коммуникации.

---

## Подключение

### URL
```
ws://localhost:5000
```
или
```
wss://your-domain.com
```

### Опции подключения
```javascript
const socket = io('http://localhost:5000', {
  transports: ['websocket', 'polling'],
  reconnection: true,
  reconnectionDelay: 1000,
  reconnectionAttempts: 5,
});
```

---

## События от сервера

### `case-opened`
Эмитится при открытии кейса любым пользователем.

**Payload:**
```typescript
{
  id: string;
  username: string;
  userAvatar: string | null;
  caseName: string;
  caseImage: string;
  itemName: string;
  itemImage: string;
  itemRarity: string;
  openedAt: Date;
}
```

**Пример:**
```javascript
socket.on('case-opened', (event) => {
  console.log(`${event.username} открыл ${event.itemName} из ${event.caseName}`);
  // Добавить в live-feed на фронтенде
});
```

### `error`
Эмитится при ошибках на сервере.

**Payload:**
```typescript
string
```

---

## События от клиента

### `join-feed`
Присоединиться к live-feed room (опционально, автоматически при подключении).

**Пример:**
```javascript
socket.emit('join-feed');
```

### `leave-feed`
Покинуть live-feed room.

**Пример:**
```javascript
socket.emit('leave-feed');
```

---

## События жизненного цикла

### `connect`
Успешное подключение к серверу.
```javascript
socket.on('connect', () => {
  console.log('Подключен к WebSocket серверу');
  console.log('Socket ID:', socket.id);
});
```

### `disconnect`
Отключение от сервера.
```javascript
socket.on('disconnect', (reason) => {
  console.log('Отключен от сервера:', reason);
});
```

### `connect_error`
Ошибка подключения.
```javascript
socket.on('connect_error', (error) => {
  console.error('Ошибка подключения:', error);
});
```

---

## Пример React интеграции
```typescript
import { useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';

interface LiveFeedEvent {
  id: string;
  username: string;
  caseName: string;
  itemName: string;
  itemRarity: string;
  openedAt: Date;
}

const useLiveFeed = () => {
  const [events, setEvents] = useState([]);
  const [socket, setSocket] = useState(null);

  useEffect(() => {
    // Подключение
    const newSocket = io('http://localhost:5000');

    newSocket.on('connect', () => {
      console.log('WebSocket подключен');
    });

    newSocket.on('case-opened', (event: LiveFeedEvent) => {
      setEvents((prev) => [event, ...prev].slice(0, 50)); // Последние 50
    });

    setSocket(newSocket);

    // Отключение при unmount
    return () => {
      newSocket.close();
    };
  }, []);

  return { events, socket };
};

export default useLiveFeed;
```

---

## Безопасность

- CORS настроен на основе `CORS_ORIGIN` из .env
- WebSocket security middleware применяется автоматически
- Все события логируются на сервере

---

## Производительность

- Ping interval: 25 секунд
- Ping timeout: 60 секунд
- Auto-reconnection включён
- Room-based broadcasting для оптимизации

---

## Отладка

### Включить debug режим (клиент)
```javascript
localStorage.debug = 'socket.io-client:*';
```

### Проверка подключения
```javascript
socket.on('connect', () => console.log('Connected:', socket.id));
socket.on('disconnect', () => console.log('Disconnected'));
```

---
