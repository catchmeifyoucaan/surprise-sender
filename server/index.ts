import express, { Request, Response, NextFunction } from 'express';
import nodemailer, { SentMessageInfo, TransportOptions } from 'nodemailer';
import cors from 'cors';
import { DataSource, Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { SmtpConfiguration, EmailTracking, User, UserActivity, EmailTemplate, Campaign, Agent, UserPreferencesEntity } from './entities';
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

interface ValidationResult {
    success: boolean;
    error?: string;
}

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
  // Set timeout for the request
  req.setTimeout(30000); // 30 seconds
  res.setTimeout(30000); // 30 seconds
  
  // Handle timeout
  req.on('timeout', () => {
    console.log('Request timeout');
    res.status(408).json({ error: 'Request timeout' });
  });
  
  res.on('timeout', () => {
    console.log('Response timeout');
    res.status(408).json({ error: 'Response timeout' });
  });
  
  next();
});

// Simple rate limiting middleware
const rateLimit = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT_WINDOW = 60000; // 1 minute
const MAX_REQUESTS = 1000; // Increased for development

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

  // Get or create rate limit entry
  const rateLimitEntry = rateLimit.get(ip) || { count: 0, resetTime: now };
  
  // Check if we're in a new window
  if (now - rateLimitEntry.resetTime > RATE_LIMIT_WINDOW) {
    rateLimitEntry.count = 0;
    rateLimitEntry.resetTime = now;
  }

  // Increment count
  rateLimitEntry.count++;
  rateLimit.set(ip, rateLimitEntry);

  // Check if rate limit exceeded
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
    
    // Start server after database is initialized
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
      console.log('Cleaning up SMTP connections...');
      for (const transporter of smtpPool.values()) {
        try {
          await transporter.close();
        } catch (error) {
          console.error('Error closing SMTP connection:', error);
        }
      }
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

// Log all requests
app.use((req, res, next) => {
  console.log(`${req.method} ${req.path}`, {
    body: req.body,
    headers: req.headers
  });
  next();
});

// Error handling middleware
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  console.error(err.stack);
  res.status(err.status || 500).json({
    message: err.message || 'Internal Server Error',
    error: process.env.NODE_ENV === 'development' ? err : {}
  });
});

// Add SMTP connection pool
const smtpPool = new Map<string, nodemailer.Transporter>();

// Enhanced SMTP validation with retry logic
async function validateSmtpWithRetry(config: SmtpConfiguration, retries = 3): Promise<{ success: boolean; error?: string }> {
  let lastError: string | undefined;
  
  for (let i = 0; i < retries; i++) {
    try {
      const result = await validateSmtpConfig(config);
      if (result.success) {
        config.isValid = true;
        config.lastError = undefined;
        config.lastValidated = new Date();
        await AppDataSource.getRepository(SmtpConfiguration).save(config);
        return { success: true };
      }
      lastError = result.error;
    } catch (error) {
      lastError = error instanceof Error ? error.message : 'Unknown error';
    }
    
    if (i < retries - 1) {
      await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
    }
  }

  config.isValid = false;
  config.lastError = lastError;
  config.lastValidated = new Date();
  await AppDataSource.getRepository(SmtpConfiguration).save(config);
  
  return { success: false, error: lastError };
}

// Enhanced SMTP validation endpoint
app.post('/api/validate-smtp', async (req, res) => {
  try {
    const { configs } = req.body;

    if (!Array.isArray(configs)) {
      return res.status(400).json({ error: 'Invalid request body' });
    }

    const results = await Promise.all(
      configs.map(async (config: SmtpConfiguration) => {
        const validation = await validateSmtpWithRetry(config);
        
        if (validation.success) {
          // Update or create configuration in database
          const existingConfig = await AppDataSource.getRepository(SmtpConfiguration)
            .findOne({ where: { id: config.id } });

          if (existingConfig) {
            Object.assign(existingConfig, config);
            await AppDataSource.getRepository(SmtpConfiguration).save(existingConfig);
          } else {
            await AppDataSource.getRepository(SmtpConfiguration).save(config);
          }
        }

        return {
          id: config.id,
          success: validation.success,
          error: validation.error
        };
      })
    );

    res.json({ results });
  } catch (error) {
    console.error('SMTP validation error:', error);
    res.status(500).json({
      error: 'Failed to validate SMTP configurations',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Email sending endpoint
app.post('/api/send-email', async (req, res) => {
  const { emailData, smtpConfigs }: { emailData: EmailData; smtpConfigs: SmtpConfiguration | SmtpConfiguration[] } = req.body;
  if (!emailData || !smtpConfigs) {
    return res.status(400).json({ 
      success: false, 
      error: 'Missing email data or SMTP configuration' 
    });
  }
  if (!emailData.to || !emailData.subject || !emailData.body) {
    return res.status(400).json({ 
      success: false, 
      error: 'Missing required email fields (to, subject, or body)' 
    });
  }
  const configs = Array.isArray(smtpConfigs) ? smtpConfigs : [smtpConfigs];
  for (const smtpConfig of configs) {
    try {
      console.log('Trying SMTP configuration:', smtpConfig.host);
      const transporter = nodemailer.createTransport({
        host: smtpConfig.host,
        port: typeof smtpConfig.port === 'string' ? parseInt(smtpConfig.port) : smtpConfig.port,
        secure: smtpConfig.port === 465,
        auth: {
          user: smtpConfig.username,
          pass: smtpConfig.password,
        },
      } as TransportOptions);
      await transporter.verify();
      console.log('SMTP validation successful for:', smtpConfig.host);
      const mailOptions = {
        from: smtpConfig.username,
        to: emailData.to,
        subject: emailData.subject,
        text: emailData.body,
        html: emailData.body
      };
      console.log('Sending email to:', emailData.to);
      const info = await transporter.sendMail(mailOptions) as SentMessageInfo;
      if (!info) {
        throw new Error('Failed to send email: No response from SMTP server');
      }
      console.log('Email sent successfully:', info.messageId);
      const trackingRepo = AppDataSource.getRepository(EmailTracking);
      await trackingRepo.save({
        email: emailData.to,
        subject: emailData.subject,
        status: 'delivered',
        details: `Message ID: ${info.messageId}`,
        smtpConfigId: smtpConfig.id
      });
      return res.json({ 
        success: true,
        messageId: info.messageId,
        usedConfig: smtpConfig
      });
    } catch (error: any) {
      console.error(`Failed with SMTP ${smtpConfig.host}:`, error);
      const trackingRepo = AppDataSource.getRepository(EmailTracking);
      await trackingRepo.save({
        email: emailData.to,
        subject: emailData.subject,
        status: 'failed',
        details: error.message,
        smtpConfigId: smtpConfig.id
      });
      continue;
    }
  }
  res.status(500).json({ 
    success: false, 
    error: 'Failed to send email with all SMTP configurations' 
  });
});

// Get SMTP configurations
app.get('/api/smtp-configurations', async (req, res) => {
  try {
    const smtpRepo = AppDataSource.getRepository(SmtpConfiguration);
    const configs = await smtpRepo.find({
      where: { isActive: true },
      order: { createdAt: 'DESC' }
    });
    
    console.log('Retrieved SMTP configurations:', configs.length);
    
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

// Get SMTP statistics
app.get('/api/smtp-stats', async (req, res) => {
  try {
    const smtpRepo = AppDataSource.getRepository(SmtpConfiguration);
    const total = await smtpRepo.count();
    const active = await smtpRepo.count({ where: { isActive: true, isValid: true } });
    const successRate = total > 0 ? Math.round((active / total) * 100) : 0;

    console.log('SMTP stats:', { total, active, successRate });

    res.json({
      success: true,
      active,
      total,
      successRate
    });
  } catch (error: any) {
    console.error('Failed to get SMTP stats:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to get SMTP statistics'
    });
  }
});

// Get email statistics
app.get('/api/email-stats', async (req, res) => {
  try {
    const trackingRepo = AppDataSource.getRepository(EmailTracking);
    const smtpRepo = AppDataSource.getRepository(SmtpConfiguration);

    const totalSent = await trackingRepo.count();
    const totalOpened = await trackingRepo.count({ where: { status: 'opened' } });
    const totalClicked = await trackingRepo.count({ where: { status: 'clicked' } });
    const totalBounced = await trackingRepo.count({ where: { status: 'bounced' } });

    const activeSmtps = await smtpRepo.count({ where: { isActive: true, isValid: true } });
    const totalSmtps = await smtpRepo.count();

    res.json({
      success: true,
      stats: {
        totalSent,
        totalOpened,
        totalClicked,
        openRate: totalSent > 0 ? (totalOpened / totalSent) * 100 : 0,
        clickRate: totalSent > 0 ? (totalClicked / totalSent) * 100 : 0,
        bounceRate: totalSent > 0 ? (totalBounced / totalSent) * 100 : 0,
        activeSmtps,
        totalSmtps,
        successRate: totalSmtps > 0 ? (activeSmtps / totalSmtps) * 100 : 0
      }
    });
  } catch (error: any) {
    console.error('Failed to get email stats:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to get email statistics'
    });
  }
});

// Get recent activity
app.get('/api/recent-activity', async (req, res) => {
  try {
    const trackingRepo = AppDataSource.getRepository(EmailTracking);
    const activities = await trackingRepo.find({
      order: { timestamp: 'DESC' },
      take: 50
    });

    res.json({
      success: true,
      activities
    });
  } catch (error: any) {
    console.error('Failed to get recent activity:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to get recent activity'
    });
  }
});

// Add a test endpoint
app.get('/api/test', (req, res) => {
  res.json({ message: 'Server is running!' });
});

// Cache for settings endpoints
interface CacheEntry<T> {
  data: T | null;
  timestamp: number;
}

interface SettingsCache {
  smtp: CacheEntry<{ success: boolean; data: SmtpConfiguration[] }>;
  preferences: CacheEntry<{
    success: boolean;
    data: {
      theme: string;
      notifications: {
        email: boolean;
        telegram: boolean;
        desktop: boolean;
      };
      language: string;
      timezone: string;
    };
  }>;
  security: CacheEntry<{
    success: boolean;
    data: {
      twoFactorEnabled: boolean;
      sessionTimeout: number;
      passwordExpiry: number;
      loginAttempts: number;
      lastPasswordChange: string;
      loginHistory: any[];
      securityLevel: string;
    };
  }>;
}

const settingsCache: SettingsCache = {
  smtp: { data: null, timestamp: 0 },
  preferences: { data: null, timestamp: 0 },
  security: { data: null, timestamp: 0 }
};

const CACHE_DURATION = 30000; // 30 seconds cache

// SMTP Configuration Endpoints
app.get('/api/settings/smtp', authenticateJWT, async (req, res) => {
    try {
        if (!req.user) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        const smtpRepo = AppDataSource.getRepository(SmtpConfiguration);
        const configs = await smtpRepo.find({
            where: { userId: req.user.id },
            order: {
                isActive: 'DESC',
                isValid: 'DESC',
                createdAt: 'DESC'
            }
        });

        const sortedConfigs = sortSmtpConfigs(configs);
        res.json(sortedConfigs);
    } catch (error) {
        console.error('Error fetching SMTP configurations:', error);
        res.status(500).json({ error: 'Failed to fetch SMTP configurations' });
    }
});

// Get user preferences
app.get('/api/settings/preferences', async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const preferencesRepo = AppDataSource.getRepository(UserPreferencesEntity);
    let preferences = await preferencesRepo.findOne({ 
      where: { userId: req.user.id } 
    });
    
    if (!preferences) {
      preferences = preferencesRepo.create({
        userId: req.user.id,
        theme: 'dark',
        notifications: {
          email: true,
          telegram: false,
          desktop: true
        },
        language: 'en',
        timezone: 'UTC'
      });
      await preferencesRepo.save(preferences);
    }

    res.json(preferences);
  } catch (error) {
    console.error('Error fetching preferences:', error);
    res.status(500).json({ error: 'Failed to fetch preferences' });
  }
});

// Get security settings
app.get('/api/settings/security', async (req, res) => {
    try {
        if (!req.user) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        let securityLevel = req.user.twoFactorEnabled ? 'high' : 'medium';
        if (req.user.loginAttempts > 3) {
            securityLevel = 'low';
        }

        res.json({
            twoFactorEnabled: req.user.twoFactorEnabled,
            sessionTimeout: req.user.sessionTimeout,
            passwordExpiry: req.user.passwordExpiry,
            loginAttempts: req.user.loginAttempts,
            lastPasswordChange: req.user.lastPasswordChange?.toISOString() || new Date().toISOString(),
            loginHistory: req.user.loginHistory || [],
            securityLevel
        });
    } catch (error) {
        console.error('Error fetching security settings:', error);
        res.status(500).json({ error: 'Failed to fetch security settings' });
    }
});

// Update security settings
app.patch('/api/settings/security', async (req, res) => {
    try {
        if (!req.user) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        const { twoFactorEnabled, sessionTimeout, passwordExpiry, loginAttempts } = req.body;
        const userRepo = AppDataSource.getRepository(User);

        if (twoFactorEnabled !== undefined) {
            req.user.twoFactorEnabled = twoFactorEnabled;
            if (twoFactorEnabled) {
                req.user.twoFactorSecret = uuidv4();
            } else {
                req.user.twoFactorSecret = '';
            }
        }
        if (sessionTimeout !== undefined) req.user.sessionTimeout = sessionTimeout;
        if (passwordExpiry !== undefined) req.user.passwordExpiry = passwordExpiry;
        if (loginAttempts !== undefined) req.user.loginAttempts = loginAttempts;

        await userRepo.save(req.user);

        let securityLevel = req.user.twoFactorEnabled ? 'high' : 'medium';
        if (req.user.loginAttempts > 3) {
            securityLevel = 'low';
        }

        res.json({
            twoFactorEnabled: req.user.twoFactorEnabled,
            sessionTimeout: req.user.sessionTimeout,
            passwordExpiry: req.user.passwordExpiry,
            loginAttempts: req.user.loginAttempts,
            lastPasswordChange: req.user.lastPasswordChange?.toISOString() || new Date().toISOString(),
            loginHistory: req.user.loginHistory || [],
            securityLevel
        });
    } catch (error) {
        console.error('Error updating security settings:', error);
        res.status(500).json({ error: 'Failed to update security settings' });
    }
});

// API Key Management Endpoints
app.get('/api/settings/api-keys', async (req, res) => {
  try {
    const userId = req.user?.id;
    const apiKeys = await AppDataSource.getRepository(ApiKeyEntity)
      .find({ where: { userId } });

    res.json({
      success: true,
      data: apiKeys.map(key => ({
        ...key,
        key: undefined // Don't send the actual key
      }))
    });
  } catch (error) {
    console.error('Error fetching API keys:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch API keys'
    });
  }
});

app.post('/api/settings/api-keys', async (req, res) => {
  try {
    const { service, key, label } = req.body;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Validate API key based on service
    let isValid = false;
    switch (service) {
      case 'openai':
        isValid = await validateOpenAIKey(key);
        break;
      case 'gemini':
        isValid = await validateGeminiKey(key);
        break;
      case 'claude':
        isValid = await validateClaudeKey(key);
        break;
      case 'telegram':
        isValid = await validateTelegramBot(key);
        break;
      case 'mailgun':
      case 'ses':
      case 'sendgrid':
        isValid = await validateEmailServiceKey(service, key);
        break;
      default:
        return res.status(400).json({
          success: false,
          error: `Unsupported service: ${service}`
        });
    }

    if (!isValid) {
      return res.status(400).json({
        success: false,
        error: `Invalid ${service} API key`
      });
    }

    const apiKey = await AppDataSource.getRepository(ApiKeyEntity).save({
      service,
      key,
      label,
      isActive: true,
      userId
    });

    res.json({
      success: true,
      data: {
        ...apiKey,
        key: undefined // Don't send the actual key back
      }
    });
  } catch (error) {
    console.error('Error adding API key:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to add API key'
    });
  }
});

app.delete('/api/settings/api-keys/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;

    const apiKey = await AppDataSource.getRepository(ApiKeyEntity)
      .findOne({ where: { id, userId } });

    if (!apiKey) {
      return res.status(404).json({
        success: false,
        error: 'API key not found'
      });
    }

    await AppDataSource.getRepository(ApiKeyEntity).remove(apiKey);

    res.json({
      success: true,
      message: 'API key deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting API key:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete API key'
    });
  }
});

// SMTP Configuration Creation Endpoint
app.post('/api/settings/smtp', async (req, res) => {
    try {
        const user = await getUserFromRequest(req);
        if (!user) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        const config = new SmtpConfiguration();
        Object.assign(config, req.body);
        config.userId = user.id;

        // Validate SMTP configuration
        const validationResult = await validateSmtpConfig(config);
        const isValid = Boolean(validationResult.success);
        config.isValid = isValid;
        config.isActive = isValid;
        
        if (validationResult.error) {
            config.lastError = validationResult.error;
        }

        // Update validation timestamp
        config.lastValidated = new Date();

        // Save configuration
        await AppDataSource.getRepository(SmtpConfiguration).save(config);

        // Return success response
        res.json({
            success: true,
            config: {
                ...config,
                password: undefined // Don't send password back to client
            }
        });
    } catch (error) {
        console.error('Error creating SMTP configuration:', error);
        res.status(500).json({ error: 'Failed to create SMTP configuration' });
    }
});

// SMTP Configuration Test Endpoint
app.post('/api/settings/smtp/:id/test', async (req, res) => {
    try {
        const user = await getUserFromRequest(req);
        if (!user) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        const config = await AppDataSource.getRepository(SmtpConfiguration)
            .findOne({ where: { id: req.params.id, userId: user.id } });

        if (!config) {
            return res.status(404).json({ error: 'SMTP configuration not found' });
        }

        // Validate SMTP configuration
        const validationResult = await validateSmtpConfig(config);
        const isValid = Boolean(validationResult.success);
        config.isValid = isValid;
        config.isActive = isValid;
        
        if (validationResult.error) {
            config.lastError = validationResult.error;
        }

        // Update validation timestamp
        config.lastValidated = new Date();

        // Save configuration
        await AppDataSource.getRepository(SmtpConfiguration).save(config);

        // Return validation result
        res.json({
            success: validationResult.success,
            error: validationResult.error
        });
    } catch (error) {
        console.error('Error testing SMTP configuration:', error);
        res.status(500).json({ error: 'Failed to test SMTP configuration' });
    }
});

// Update user preferences
app.patch('/api/settings/preferences', async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { theme, notifications, language, timezone, displayName, email } = req.body;
    const preferencesRepo = AppDataSource.getRepository(UserPreferencesEntity);
    let preferences = await preferencesRepo.findOne({ 
      where: { userId: req.user.id } 
    });
    
    if (!preferences) {
      preferences = preferencesRepo.create({
        userId: req.user.id,
        theme: theme || 'dark',
        notifications: notifications || {
          email: true,
          telegram: false,
          desktop: true
        },
        language: language || 'en',
        timezone: timezone || 'UTC',
        displayName,
        email
      });
    } else {
      preferences.theme = theme || preferences.theme;
      preferences.notifications = notifications || preferences.notifications;
      preferences.language = language || preferences.language;
      preferences.timezone = timezone || preferences.timezone;
      preferences.displayName = displayName || preferences.displayName;
      preferences.email = email || preferences.email;
    }

    await preferencesRepo.save(preferences);
    res.json(preferences);
  } catch (error) {
    console.error('Error updating preferences:', error);
    res.status(500).json({ error: 'Failed to update preferences' });
  }
});

// Helper functions for validation
async function validateOpenAIKey(key: string): Promise<boolean> {
  try {
    const response = await fetch('https://api.openai.com/v1/models', {
      headers: { 'Authorization': `Bearer ${key}` }
    });
    return response.ok;
  } catch {
    return false;
  }
}

async function validateGeminiKey(key: string): Promise<boolean> {
  try {
    const response = await fetch('https://generativelanguage.googleapis.com/v1beta/models', {
      headers: { 'Authorization': `Bearer ${key}` }
    });
    return response.ok;
  } catch {
    return false;
  }
}

async function validateClaudeKey(key: string): Promise<boolean> {
  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      headers: { 'x-api-key': key }
    });
    return response.ok;
  } catch {
    return false;
  }
}

async function validateTelegramBot(token: string): Promise<boolean> {
  try {
    const response = await fetch(`https://api.telegram.org/bot${token}/getMe`);
    return response.ok;
  } catch {
    return false;
  }
}

async function validateEmailServiceKey(service: string, key: string): Promise<boolean> {
  switch (service.toLowerCase()) {
    case 'mailgun':
      return await validateMailgunKey(key);
    case 'ses':
      return await validateSESKey(key);
    case 'sendgrid':
      return await validateSendgridKey(key);
    default:
      return false;
  }
}

// Email service validation functions
async function validateMailgunKey(key: string): Promise<boolean> {
  try {
    const response = await fetch('https://api.mailgun.net/v3/domains', {
      headers: { 'Authorization': `Basic ${Buffer.from(`api:${key}`).toString('base64')}` }
    });
    return response.ok;
  } catch {
    return false;
  }
}

async function validateSESKey(key: string): Promise<boolean> {
  try {
    const response = await fetch('https://email.us-east-1.amazonaws.com/v2/email/identities', {
      headers: { 'Authorization': `AWS4-HMAC-SHA256 Credential=${key}` }
    });
    return response.ok;
  } catch {
    return false;
  }
}

async function validateSendgridKey(key: string): Promise<boolean> {
  try {
    const response = await fetch('https://api.sendgrid.com/v3/mail/settings', {
      headers: { 'Authorization': `Bearer ${key}` }
    });
    return response.ok;
  } catch {
    return false;
  }
}

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // Increased to 5MB
  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      'text/csv',
      'text/plain',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel'
    ];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type'));
    }
  }
});

// SMTP Import endpoint
app.post('/api/settings/smtp/import', authenticateJWT, upload.single('file'), async (req, res) => {
  try {
    const user = await getUserFromRequest(req);
    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const file = req.file;
    if (!file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    // Check file size
    if (file.size > 5 * 1024 * 1024) { // 5MB
      return res.status(400).json({ error: 'File too large. Maximum size is 5MB' });
    }

    const content = file.buffer.toString('utf-8');
    const lines = content.split('\n').filter(line => line.trim());
    
    const results = {
      total: lines.length,
      success: 0,
      failed: 0,
      errors: [] as string[],
      configs: [] as SmtpConfiguration[]
    };

    for (const line of lines) {
      try {
        // Parse the line (format: email:password)
        const [email, password] = line.split(':').map(part => part.trim());
        if (!email || !password) {
          throw new Error('Invalid format. Expected email:password');
        }

        // Extract domain and provider
        const domain = email.split('@')[1].toLowerCase();
        const provider = domain.split('.')[0];
        const isWebmail = ['gmail', 'outlook', 'hotmail', 'yahoo', 'hostinger', 'aol', 'protonmail', 'zoho'].includes(provider);

        // Create SMTP configuration
        const config = new SmtpConfiguration();
        config.userId = user.id;
        config.name = email;
        config.username = email;
        config.password = password;
        config.providerType = isWebmail ? 'webmail' : 'smtp';
        config.webmailProvider = isWebmail ? provider : undefined;

        // Set host based on provider
        if (isWebmail) {
          switch (provider) {
            case 'gmail':
              config.host = 'smtp.gmail.com';
              break;
            case 'outlook':
            case 'hotmail':
              config.host = 'smtp-mail.outlook.com';
              break;
            case 'yahoo':
              config.host = 'smtp.mail.yahoo.com';
              break;
            case 'hostinger':
              config.host = 'smtp.hostinger.com';
              break;
            case 'aol':
              config.host = 'smtp.aol.com';
              break;
            case 'protonmail':
              config.host = 'smtp.protonmail.ch';
              break;
            case 'zoho':
              config.host = 'smtp.zoho.com';
              break;
            default:
              config.host = `smtp.${provider}.com`;
          }
        } else {
          config.host = `smtp.${provider}.com`;
        }

        config.port = 587;
        config.isActive = true;
        config.maxEmailsPerDay = 1000;
        config.currentEmailsSent = 0;
        config.status = 'inactive';
        config.isValid = false;
        config.createdAt = new Date();
        config.updatedAt = new Date();

        // Save the configuration
        const savedConfig = await AppDataSource.getRepository(SmtpConfiguration).save(config);
        results.success++;
        results.configs.push(savedConfig);
      } catch (error) {
        results.failed++;
        results.errors.push(`Error processing line: ${line} - ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    res.json(results);
  } catch (error) {
    console.error('Error importing SMTP configurations:', error);
    res.status(500).json({ 
      error: 'Failed to import SMTP configurations',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Activity logging middleware
app.use(async (req: Request, res: Response, next: NextFunction) => {
  const originalSend = res.send;
  res.send = function (body) {
    res.send = originalSend;
    const result = originalSend.call(this, body);
    
    // Only log if we have a user
    if (req.user) {
      const activityRepo = AppDataSource.getRepository(UserActivity);
      const activity = new UserActivity();
      activity.description = `${req.method} ${req.path}`;
      activity.metadata = {
        action: req.method,
        details: JSON.stringify(req.body),
        ipAddress: req.ip,
        userAgent: req.headers['user-agent']
      };
      activity.timestamp = new Date();
      activity.user = req.user; // Set the user relation instead of userId
      
      activityRepo.save(activity).catch(err => {
        console.error('Error saving activity:', err);
      });
    }
    
    return result;
  };
  next();
});

// Enhanced user authentication endpoint
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await AppDataSource.getRepository(User).findOne({ where: { email } });

    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Check if user is active
    if (user.status !== 'active') {
      return res.status(401).json({ error: 'Account is not active' });
    }

    // Check if user is locked out
    if (user.loginAttempts >= (user.securitySettings?.maxLoginAttempts || 5)) {
      const lockoutDuration = 15 * 60 * 1000; // 15 minutes
      const lastAttempt = user.loginHistory?.[user.loginHistory.length - 1]?.timestamp;
      
      if (lastAttempt && Date.now() - new Date(lastAttempt).getTime() < lockoutDuration) {
        return res.status(429).json({
          error: 'Account temporarily locked',
          retryAfter: Math.ceil((lockoutDuration - (Date.now() - new Date(lastAttempt).getTime())) / 1000)
        });
      }
      
      // Reset login attempts after lockout period
      user.loginAttempts = 0;
    }

    // Verify password
    const isValid = await bcrypt.compare(password, user.password);
    
    // Update login history
    const loginAttempt = {
      timestamp: new Date(),
      ip: req.ip || 'unknown',
      userAgent: req.get('user-agent') || 'unknown',
      success: isValid
    };

    user.loginHistory = [...(user.loginHistory || []), loginAttempt];

    if (!isValid) {
      user.loginAttempts += 1;
      await AppDataSource.getRepository(User).save(user);
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Reset login attempts on successful login
    user.loginAttempts = 0;
    user.lastLogin = new Date();
    await AppDataSource.getRepository(User).save(user);

    // Generate JWT token
    const token = jwt.sign(
      { id: user.id },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '1h' }
    );

    res.json({
      success: true,
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        permissions: user.permissions,
        preferences: user.preferences,
        company: user.company
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to authenticate user',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Enhanced password reset endpoint
app.post('/api/auth/reset-password', async (req, res) => {
  try {
    const { email } = req.body;
    const user = await AppDataSource.getRepository(User).findOne({ where: { email } });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString('hex');
    const hashedToken = await bcrypt.hash(resetToken, 10);

    // Set token expiry (1 hour)
    user.resetToken = hashedToken;
    user.passwordResetExpiry = new Date(Date.now() + 3600000);
    await AppDataSource.getRepository(User).save(user);

    // Send reset email
    const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`;
    const emailContent = `
      <p>You requested a password reset.</p>
      <p>Click this <a href="${resetUrl}">link</a> to reset your password.</p>
      <p>This link will expire in 1 hour.</p>
      <p>If you didn't request this, please ignore this email.</p>
    `;

    // Get active SMTP configuration
    const smtpConfig = await AppDataSource.getRepository(SmtpConfiguration)
      .findOne({ where: { isActive: true, isValid: true } });

    if (!smtpConfig) {
      throw new Error('No valid SMTP configuration found');
    }

    const transporter = nodemailer.createTransport({
      host: smtpConfig.host,
      port: smtpConfig.port,
      secure: smtpConfig.secure,
      auth: {
        user: smtpConfig.username,
        pass: smtpConfig.password
      }
    });

    await transporter.sendMail({
      from: smtpConfig.fromEmail,
      to: user.email,
      subject: 'Password Reset Request',
      html: emailContent
    });

    res.json({ message: 'Password reset instructions sent to your email' });
  } catch (error) {
    console.error('Password reset error:', error);
    res.status(500).json({
      error: 'Failed to process password reset',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Registration endpoint
app.post('/api/auth/register', async (req, res) => {
  try {
    const { fullName, email, password, company } = req.body;

    // Validate input
    if (!fullName || !email || !password) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields'
      });
    }

    // Check if user already exists
    const userRepo = AppDataSource.getRepository(User);
    const existingUser = await userRepo.findOne({ where: { email } });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        error: 'Email already registered'
      });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create new user
    const user = new User();
    user.name = fullName;
    user.email = email;
    user.password = hashedPassword;
    user.role = 'user';
    user.status = 'active';
    user.company = company || email;
    user.loginAttempts = 0;
    user.twoFactorEnabled = false;
    user.securitySettings = {
      sessionTimeout: 3600,
      passwordExpiry: 90,
      maxLoginAttempts: 5,
      requireTwoFactor: false,
      passwordHistory: [],
      lastPasswordChange: new Date()
    };
    user.emailVerifiedAt = undefined;
    user.twoFactorRecoveryCodes = [];
    user.preferences = {
      theme: 'dark',
      notifications: {
        email: true,
        telegram: false,
        desktop: true
      },
      language: 'en',
      timezone: 'UTC'
    };
    user.permissions = ['canSendEmails', 'canManageUsers', 'canManageTemplates', 'canManageCampaigns', 'canManageAgents'];
    user.loginHistory = [];

    // Save user
    await userRepo.save(user);

    // Generate JWT token
    const token = jwt.sign(
      { id: user.id },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '1h' }
    );

    // Return success response
    res.status(201).json({
      success: true,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        company: user.company,
        permissions: user.permissions,
        preferences: user.preferences
      },
      token
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to register user',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Get user profile
app.get('/api/users/profile', async (req, res) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  res.json(req.user);
});

// Get user activities
app.get('/api/users/activities', authenticateJWT, async (req, res) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  const activities = await AppDataSource.getRepository(UserActivity).find({
    where: { user: { id: req.user.id } },
    order: { timestamp: 'DESC' }
  });
  res.json(activities);
});

// Log user activity
app.post('/api/users/activities', authenticateJWT, async (req, res) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  const { description } = req.body;
  const activity = new UserActivity();
  activity.user = req.user;
  activity.description = description;
  activity.timestamp = new Date();
  await AppDataSource.getRepository(UserActivity).save(activity);
  res.json({ success: true });
});

// Dashboard stats (dummy data for now)
app.get('/api/dashboard/stats', async (req, res) => {
  res.json({
    emails: { total: 0, sent: 0, failed: 0, pending: 0, successRate: 0 },
    sms: { total: 0, sent: 0, failed: 0, pending: 0, successRate: 0 },
    html: { total: 0, sent: 0, failed: 0, pending: 0, successRate: 0 }
  });
});

// Dashboard activity (dummy data for now)
app.get('/api/dashboard/activity', async (req, res) => {
  res.json([]);
});

// --- BEGIN: Debug endpoint for JWT/token ---
app.get('/api/debug/token', (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No Authorization header provided', details: 'Expected Bearer token in Authorization header.' });
  }
  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
    res.json({
      token,
      decoded,
      user: req.user || null
    });
  } catch (err) {
    res.status(401).json({ error: 'Invalid or expired token', details: err instanceof Error ? err.message : err });
  }
});
// --- END: Debug endpoint ---

// --- BEGIN: Improved error messages for 401/429 ---
// Update protected endpoints to use requireAuth for consistent error messages
// Example usage: app.get('/api/settings/smtp', requireAuth, ...)
// You can refactor all protected endpoints to use requireAuth for consistent error messages.
// --- END: Improved error messages ---

// Update SMTP validation endpoint
app.post('/api/settings/smtp/:id/validate', authenticateJWT, async (req, res) => {
  try {
    const config = await AppDataSource.getRepository(SmtpConfiguration).findOne({
      where: { id: req.params.id }
    });

    if (!config) {
      return res.status(404).json({ error: 'SMTP configuration not found' });
    }

    const validationResult = await validateSmtpWithRetry(config);
    config.isValid = validationResult.success;
    if (!validationResult.success) {
      config.lastError = validationResult.error;
    }
    config.lastValidated = new Date();
    await AppDataSource.getRepository(SmtpConfiguration).save(config);

    res.json(validationResult);
  } catch (error) {
    console.error('Error validating SMTP:', error);
    res.status(500).json({ error: 'Failed to validate SMTP configuration' });
  }
});

// Update SMTP stats endpoint
app.get('/api/settings/smtp/stats', authenticateJWT, async (req, res) => {
  try {
    const smtpRepo = AppDataSource.getRepository(SmtpConfiguration);
    const total = await smtpRepo.count();
    const active = await smtpRepo.count({ where: { isActive: true } });
    const valid = await smtpRepo.count({ where: { isValid: true } });

    res.json({
      total,
      active,
      valid,
      invalid: total - valid
    });
  } catch (error) {
    console.error('Error getting SMTP stats:', error);
    res.status(500).json({ error: 'Failed to get SMTP stats' });
  }
});

// Update user verification endpoint
app.post('/api/auth/verify-email', async (req, res) => {
  try {
    const { token } = req.body;
    const userRepo = AppDataSource.getRepository(User);
    const user = await userRepo.findOne({ where: { verificationToken: token } });

    if (!user) {
      return res.status(400).json({ error: 'Invalid verification token' });
    }

    user.emailVerifiedAt = new Date();
    user.verificationToken = undefined;
    await userRepo.save(user);

    res.json({ success: true });
  } catch (error) {
    console.error('Error verifying email:', error);
    res.status(500).json({ error: 'Failed to verify email' });
  }
});

// Update user permissions
app.post('/api/users/:id/permissions', authenticateJWT, async (req, res) => {
  try {
    const user = await AppDataSource.getRepository(User).findOne({
      where: { id: req.params.id }
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    user.permissions = req.body.permissions;
    await AppDataSource.getRepository(User).save(user);

    res.json({ success: true });
  } catch (error) {
    console.error('Error updating user permissions:', error);
    res.status(500).json({ error: 'Failed to update user permissions' });
  }
}); 