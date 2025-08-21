import 'express';
import type { User } from '../entities/User';

declare global {
  namespace Express {
    interface Request {
      user?: User;
      authError?: string;
    }
  }
}

export {};
