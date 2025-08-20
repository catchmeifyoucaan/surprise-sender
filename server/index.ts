import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import { DataSource } from 'typeorm';
import { User, SmtpConfiguration, EmailTracking, UserActivity, EmailTemplate, Campaign, Agent, UserPreferencesEntity } from './entities';
import { EmailData } from './types';
import 'reflect-metadata';
import { v4 as uuidv4 } from 'uuid';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { validateSmtpConfig, sortSmtpConfigs } from './utils/smtp';
import { authenticateJWT } from './middleware/auth';
import crypto from 'crypto';
import speakeasy from 'speakeasy';
import { getUserFromRequest } from './utils/auth';
import multer from 'multer';
import xlsx from 'xlsx';
import { parse as csvParse } from 'csv-parse/sync';
import { AppDataSource } from './data-source';
import { ApiKeyEntity } from './entities/ApiKeyEntity';
import { errorHandler } from './middleware/validation';

// Import new route modules
import emailRoutes from './routes/email';
import agentRoutes from './routes/agents';
import adminRoutes from './routes/admin';

// Extend Express Request type to include user
declare global {
  namespace Express {
    interface Request {
      user?: User;
      authError?: string;
    }
  }
}

const app = express();

// CORS configuration
app.use(cors({
  origin: 'http://localhost:5173',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Parse JSON bodies with increased limit
app.use(express.json({ limit: '50mb' }));

// JWT Authentication middleware
app.use(async (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7);
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key') as { id: string };
      const userRepository = AppDataSource.getRepository(User);
      const user = await userRepository.findOne({ where: { id: decoded.id } });
      
      if (user) {
        req.user = user;
      } else {
        return res.status(401).json({ message: 'User not found' });
      }
    } catch (error) {
      return res.status(401).json({ message: 'Invalid token' });
    }
  }
  next();
});

// Set timeouts for all connections
app.use((req, res, next) => {
  req.setTimeout(30000);
  res.setTimeout(30000);
  
  req.on('timeout', () => {
    res.status(408).json({ error: 'Request timeout' });
  });
  
  res.on('timeout', () => {
    res.status(408).json({ error: 'Response timeout' });
  });
  
  next();
});

// Simple rate limiting middleware
const rateLimit = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT_WINDOW = 60000;
const MAX_REQUESTS = 1000;

app.use((req, res, next) => {
  const ip = req.ip || 'unknown';
  const now = Date.now();
  const windowStart = now - RATE_LIMIT_WINDOW;

  // Clean up old entries
  for (const [key, value] of rateLimit.entries()) {
    if (value.resetTime < windowStart) {
      rateLimit.delete(key);
    }
  }

  const rateLimitEntry = rateLimit.get(ip) || { count: 0, resetTime: now };
  
  if (now - rateLimitEntry.resetTime > RATE_LIMIT_WINDOW) {
    rateLimitEntry.count = 0;
    rateLimitEntry.resetTime = now;
  }

  rateLimitEntry.count++;
  rateLimit.set(ip, rateLimitEntry);

  if (rateLimitEntry.count > MAX_REQUESTS) {
    return res.status(429).json({
      success: false,
      error: 'Too many requests. Please try again later.'
    });
  }

  next();
});

// Initialize database connection
AppDataSource.initialize()
  .then(() => {
    console.log("Data Source has been initialized!");
    
    const PORT = process.env.PORT || 3001;
    const server = app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });

    // Handle server errors
    server.on('error', (error: NodeJS.ErrnoException) => {
      if (error.code === 'EADDRINUSE') {
        console.error(`Port ${PORT} is already in use. Please try a different port or wait a few minutes.`);
        process.exit(1);
      } else {
        console.error('Server error:', error);
      }
    });

    // Handle process termination
    process.on('SIGTERM', async () => {
      console.log('Cleaning up connections...');
      process.exit(0);
    });

    process.on('SIGINT', () => {
      console.log('SIGINT received. Closing server...');
      server.close(() => {
        console.log('Server closed');
        process.exit(0);
      });
    });

    // Handle uncaught exceptions
    process.on('uncaughtException', (error) => {
      console.error('Uncaught Exception:', error);
      server.close(() => {
        process.exit(1);
      });
    });

    // Handle unhandled promise rejections
    process.on('unhandledRejection', (reason, promise) => {
      console.error('Unhandled Rejection at:', promise, 'reason:', reason);
      server.close(() => {
        process.exit(1);
      });
    });
  })
  .catch((error) => {
    console.error("Error during Data Source initialization:", error);
    process.exit(1);
  });

// Use new modular routes
app.use('/api/email', emailRoutes);
app.use('/api/agents', agentRoutes);
app.use('/api/admin', adminRoutes);

// Legacy routes (to be migrated gradually)
// Authentication routes
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({ success: false, error: 'Email and password are required' });
    }

    const userRepository = AppDataSource.getRepository(User);
    const user = await userRepository.findOne({ where: { email } });

    if (!user) {
      return res.status(401).json({ success: false, error: 'Invalid credentials' });
    }

    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      return res.status(401).json({ success: false, error: 'Invalid credentials' });
    }

    // Update last login
    user.lastLogin = new Date();
    await userRepository.save(user);

    const token = jwt.sign(
      { id: user.id, email: user.email },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '24h' }
    );

    res.json({
      success: true,
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        company: user.company
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ success: false, error: 'Login failed' });
  }
});

app.post('/api/auth/register', async (req, res) => {
  try {
    const { name, email, password, company } = req.body;
    
    if (!name || !email || !password) {
      return res.status(400).json({ success: false, error: 'Name, email, and password are required' });
    }

    const userRepository = AppDataSource.getRepository(User);
    
    // Check if user already exists
    const existingUser = await userRepository.findOne({ where: { email } });
    if (existingUser) {
      return res.status(400).json({ success: false, error: 'User already exists' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);

    // Create user
    const user = userRepository.create({
      name,
      email,
      password: hashedPassword,
      company,
      role: 'user',
      status: 'active',
      permissions: ['canSendEmails', 'canManageUsers', 'canManageTemplates', 'canManageCampaigns', 'canManageAgents'],
      twoFactorEnabled: false,
      twoFactorRecoveryCodes: [],
      preferences: {
        theme: 'light',
        notifications: {
          email: true,
          telegram: false,
          desktop: true
        },
        language: 'en',
        timezone: 'UTC'
      },
      securitySettings: {
        sessionTimeout: 30,
        passwordExpiry: 90,
        maxLoginAttempts: 5,
        requireTwoFactor: false,
        passwordHistory: [],
        lastPasswordChange: new Date()
      },
      loginHistory: []
    });

    const savedUser = await userRepository.save(user);

    const token = jwt.sign(
      { id: savedUser.id, email: savedUser.email },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '24h' }
    );

    res.status(201).json({
      success: true,
      token,
      user: {
        id: savedUser.id,
        name: savedUser.name,
        email: savedUser.email,
        role: savedUser.role,
        company: savedUser.company
      }
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ success: false, error: 'Registration failed' });
  }
});

// SMTP Configuration routes (legacy)
app.get('/api/smtp-configurations', async (req, res) => {
  try {
    const smtpRepo = AppDataSource.getRepository(SmtpConfiguration);
    const configs = await smtpRepo.find({
      where: { isActive: true },
      order: { createdAt: 'DESC' }
    });
    
    res.json({
      success: true,
      configurations: configs
    });
  } catch (error: any) {
    console.error('Failed to get SMTP configurations:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to get SMTP configurations'
    });
  }
});

// Error handling middleware (must be last)
app.use(errorHandler);

export default app; 