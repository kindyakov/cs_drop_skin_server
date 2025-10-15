import { UserRole } from './constants';

// Определяем тип для пользователя в Express Request
interface ExpressUser {
 userId: string;
  role: UserRole;
}

declare global {
  namespace Express {
    interface Request {
      user?: ExpressUser;
    }
  }
}
