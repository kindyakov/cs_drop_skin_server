import { UserRole } from './constants';

declare global {
  namespace Express {
    // Расширяем встроенный Express.User интерфейс
    interface User {
      userId: string;
      role: UserRole;
    }
  }
}
