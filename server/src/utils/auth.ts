import { Request } from 'express';
import { AppDataSource } from '../data-source';
import { User } from '../entities/User';

export async function getUserFromRequest(req: Request): Promise<User | null> {
  if (!req.user) return null;
  const userRepo = AppDataSource.getRepository(User);
  const user = await userRepo.findOne({ where: { id: req.user.id } });
  return user || null;
} 