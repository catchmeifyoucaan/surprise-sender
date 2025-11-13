import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { User } from '../entities/User';
import { AppDataSource } from '../data-source';

export const authenticateJWT = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  // Try to get token from cookie first, fall back to Authorization header for backwards compatibility
  let token = req.cookies?.token;
  if (!token) {
    token = req.headers.authorization?.split(' ')[1];
  }

  if (!token) {
    res.status(401).json({ error: 'No token provided' });
    return;
  }

  try {
    // JWT_SECRET is now required at startup, no fallback
    const decoded: any = jwt.verify(token, process.env.JWT_SECRET!);
    const userRepo = AppDataSource.getRepository(User);
    const user = await userRepo.findOne({ where: { id: decoded.id } });
    if (!user) {
      res.status(401).json({ error: 'User not found' });
      return;
    }
    // Attach minimal safe user data to request
    req.user = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      company: (user as any).company,
      status: user.status
    } as any;
    next();
  } catch (err) {
    res.status(403).json({ error: 'Invalid token' });
    return;
  }
}; 