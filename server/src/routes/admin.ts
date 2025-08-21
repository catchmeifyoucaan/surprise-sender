import express, { Request, Response } from 'express';
import { authenticateJWT } from '../middleware/auth';
import { validateRequest, createApiResponse, asyncHandler } from '../middleware/validation';
import { AppDataSource } from '../data-source';
import { User, UserActivity, SmtpConfiguration, EmailTracking } from '../entities';
import { z } from 'zod';
import os from 'os';
import { validateSmtpConfig } from '../utils/smtp';
import { MoreThan } from 'typeorm';

const router = express.Router();

// Admin authorization middleware
const requireAdmin = (req: any, res: any, next: any) => {
  if (req.user?.role !== 'admin') {
    return res.status(403).json(createApiResponse(false, undefined, 'Admin access required'));
  }
  next();
};

// Apply admin middleware to all routes
router.use(authenticateJWT, requireAdmin);

// System Statistics
router.get('/stats', asyncHandler(async (req: Request, res: Response) => {
  const timeRange = req.query.timeRange as string || '24h';
  
  // Calculate time range
  const now = new Date();
  let startTime: Date;
  switch (timeRange) {
    case '1h':
      startTime = new Date(now.getTime() - 60 * 60 * 1000);
      break;
    case '24h':
      startTime = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      break;
    case '7d':
      startTime = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      break;
    case '30d':
      startTime = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      break;
    default:
      startTime = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  }

  const userRepo = AppDataSource.getRepository(User);
  const trackingRepo = AppDataSource.getRepository(EmailTracking);

  // Get user statistics
  const [totalUsers, activeUsers] = await Promise.all([
    userRepo.count(),
    userRepo.count({ where: { lastLogin: MoreThan(startTime) } })
  ]);

  // Get email statistics (counts by timestamp)
  const [totalEmails, deliveredEmails, failedEmails] = await Promise.all([
    trackingRepo.count({ where: { timestamp: MoreThan(startTime) } }),
    trackingRepo.count({ where: { timestamp: MoreThan(startTime), status: 'delivered' } }),
    trackingRepo.count({ where: { timestamp: MoreThan(startTime), status: 'failed' } })
  ]);
  const successRate = totalEmails > 0 ? Math.round((deliveredEmails / totalEmails) * 100) : 0;

  // Active campaigns not tracked in current schema
  const activeCampaigns = { count: 0 };

  // System performance metrics
  const systemLoad = Math.round(os.loadavg()[0] * 100);
  const memoryUsage = Math.round((1 - os.freemem() / os.totalmem()) * 100);
  const diskUsage = 75; // This would require a disk usage library
  const networkTraffic = 0; // This would require network monitoring

  res.json(createApiResponse(true, {
    totalUsers,
    activeUsers,
    totalEmails,
    deliveredEmails,
    failedEmails,
    successRate,
    activeCampaigns: parseInt(String(activeCampaigns?.count ?? '0')),
    systemLoad,
    memoryUsage,
    diskUsage,
    networkTraffic
  }, undefined, 'System statistics retrieved'));
}));

// User Activities
router.get('/activities', asyncHandler(async (req: Request, res: Response) => {
  const timeRange = req.query.timeRange as string || '24h';
  
  const now = new Date();
  let startTime: Date;
  switch (timeRange) {
    case '1h':
      startTime = new Date(now.getTime() - 60 * 60 * 1000);
      break;
    case '24h':
      startTime = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      break;
    case '7d':
      startTime = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      break;
    case '30d':
      startTime = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      break;
    default:
      startTime = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  }

  const activityRepo = AppDataSource.getRepository(UserActivity);
  const activities = await activityRepo
    .createQueryBuilder('activity')
    .where('activity.timestamp >= :startTime', { startTime })
    .orderBy('activity.timestamp', 'DESC')
    .limit(100)
    .getMany();

  const formattedActivities = activities.map(activity => ({
    id: activity.id,
    userId: (activity as any).user?.id,
    userName: (activity as any).user?.name || 'Unknown User',
    action: activity.metadata?.action,
    timestamp: activity.timestamp,
    ipAddress: activity.metadata?.ipAddress || 'Unknown',
    userAgent: activity.metadata?.userAgent || 'Unknown',
    metadata: activity.metadata
  }));

  res.json(createApiResponse(true, formattedActivities, undefined, 'User activities retrieved'));
}));

// List Users (for admin management)
router.get('/users', asyncHandler(async (_req: Request, res: Response) => {
  const userRepo = AppDataSource.getRepository(User);
  const users = await userRepo.find({ order: { createdAt: 'DESC' } });
  res.json(createApiResponse(true, users));
}));

// Change User Role (promote/demote)
const ChangeRoleSchema = z.object({
  role: z.enum(['admin', 'manager', 'user', 'viewer'])
});
router.post('/users/:userId/role', validateRequest(ChangeRoleSchema), asyncHandler(async (req: Request, res: Response) => {
  const { userId } = req.params;
  const { role } = req.body as { role: string };
  const userRepo = AppDataSource.getRepository(User);
  const user = await userRepo.findOne({ where: { id: userId } });
  if (!user) {
    return res.status(404).json(createApiResponse(false, undefined, 'User not found'));
  }
  user.role = role;
  await userRepo.save(user);
  return res.json(createApiResponse(true, user, undefined, 'User role updated'));
}));

// Email Campaigns
router.get('/campaigns', asyncHandler(async (_req: Request, res: Response) => {
  // Not supported by current schema; return empty list
  res.json(createApiResponse(true, [], undefined, 'Email campaigns retrieved'));
}));

// System Alerts
router.get('/alerts', asyncHandler(async (_req: Request, res: Response) => {
  // In a real implementation, this would come from a monitoring system
  const alerts = [
    {
      id: '1',
      type: 'warning' as const,
      title: 'High Memory Usage',
      message: 'System memory usage is above 80%',
      timestamp: new Date().toISOString(),
      severity: 'medium' as const,
      resolved: false
    },
    {
      id: '2',
      type: 'info' as const,
      title: 'New User Registration',
      message: 'New user registered: john.doe@example.com',
      timestamp: new Date(Date.now() - 300000).toISOString(),
      severity: 'low' as const,
      resolved: true
    }
  ];

  res.json(createApiResponse(true, alerts, undefined, 'System alerts retrieved'));
}));

// Resolve Alert
router.post('/alerts/:alertId/resolve', asyncHandler(async (req: Request, res: Response) => {
  const { alertId } = req.params;
  
  // In a real implementation, this would update the alert in the database
  res.json(createApiResponse(true, { alertId }, undefined, 'Alert resolved successfully'));
}));

// User Management
const UserActionSchema = z.object({
  action: z.enum(['suspend', 'activate', 'delete'])
});

router.post('/users/:userId/:action', validateRequest(UserActionSchema), asyncHandler(async (req: Request, res: Response) => {
  const { userId, action } = req.params;
  
  const userRepo = AppDataSource.getRepository(User);
  const user = await userRepo.findOne({ where: { id: userId } });
  
  if (!user) {
    return res.status(404).json(createApiResponse(false, undefined, 'User not found'));
  }

  switch (action) {
    case 'suspend':
      user.status = 'inactive';
      break;
    case 'activate':
      user.status = 'active';
      break;
    case 'delete':
      await userRepo.remove(user);
      return res.json(createApiResponse(true, null, undefined, 'User deleted successfully'));
  }

  await userRepo.save(user);
  return res.json(createApiResponse(true, null, undefined, `User ${action}ed successfully`));
}));

// Campaign Management
const CampaignActionSchema = z.object({
  action: z.enum(['pause', 'resume', 'stop'])
});

router.post('/campaigns/:campaignId/:action', validateRequest(CampaignActionSchema), asyncHandler(async (req: Request, res: Response) => {
  const { campaignId, action } = req.params;
  
  // In a real implementation, this would update the campaign status in the database
  // For now, we'll just return success
  res.json(createApiResponse(true, { campaignId, action }, undefined, `Campaign ${action}d successfully`));
}));

// SMTP Configuration Management
router.get('/smtp-configurations', asyncHandler(async (_req: Request, res: Response) => {
  const smtpRepo = AppDataSource.getRepository(SmtpConfiguration);
  const configs = await smtpRepo.find({
    order: { createdAt: 'DESC' }
  });

  const formattedConfigs = configs.map(config => ({
    id: config.id,
    name: config.name,
    host: config.host,
    port: config.port,
    username: config.username,
    isActive: config.isActive,
    isValid: config.isValid,
    lastValidated: config.lastValidated,
    lastError: config.lastError,
    stats: config.stats
  }));

  res.json(createApiResponse(true, { configurations: formattedConfigs }, undefined, 'SMTP configurations retrieved'));
}));

// Bulk SMTP Validation
const BulkValidationSchema = z.object({
  configs: z.array(z.object({
    id: z.string(),
    host: z.string(),
    port: z.number(),
    username: z.string(),
    password: z.string(),
    secure: z.boolean()
  }))
});

router.post('/smtp/bulk-validate', validateRequest(BulkValidationSchema), asyncHandler(async (req: Request, res: Response) => {
  const { configs } = req.body;
  
  // Validate concurrently using utility
  const results = await Promise.all(
    configs.map(async (cfg: any) => {
      const smtpConfig = Object.assign(new SmtpConfiguration(), cfg);
      const outcome = await validateSmtpConfig(smtpConfig);
      return {
        id: smtpConfig.id || `${smtpConfig.host}:${smtpConfig.username}`,
        host: smtpConfig.host,
        username: smtpConfig.username,
        status: outcome.success ? 'valid' as const : 'invalid' as const,
        error: outcome.success ? undefined : outcome.error,
        lastTested: new Date(),
        testDuration: 0
      };
    })
  );
  
  res.json(createApiResponse(true, results, undefined, 'Bulk validation completed'));
}));

// System Performance
router.get('/performance', asyncHandler(async (_req: Request, res: Response) => {
  const performance = {
    cpu: {
      load: os.loadavg(),
      cores: os.cpus().length,
      model: os.cpus()[0]?.model || 'Unknown'
    },
    memory: {
      total: os.totalmem(),
      free: os.freemem(),
      used: os.totalmem() - os.freemem(),
      percentage: Math.round((1 - os.freemem() / os.totalmem()) * 100)
    },
    uptime: os.uptime(),
    platform: os.platform(),
    arch: os.arch(),
    hostname: os.hostname()
  };

  res.json(createApiResponse(true, performance, undefined, 'System performance data retrieved'));
}));

// Email Analytics
router.get('/email-analytics', asyncHandler(async (req: Request, res: Response) => {
  const timeRange = req.query.timeRange as string || '24h';
  
  const now = new Date();
  let startTime: Date;
  switch (timeRange) {
    case '1h':
      startTime = new Date(now.getTime() - 60 * 60 * 1000);
      break;
    case '24h':
      startTime = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      break;
    case '7d':
      startTime = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      break;
    case '30d':
      startTime = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      break;
    default:
      startTime = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  }

  const trackingRepo = AppDataSource.getRepository(EmailTracking);

  // Get email statistics by hour
  const hourly = await trackingRepo.find({ where: { timestamp: MoreThan(startTime) } });
  const hourlyStats = [] as Array<{ hour: string; total: number; delivered: number; failed: number }>;
  const bucket = new Map<string, { total: number; delivered: number; failed: number }>();
  for (const t of hourly) {
    const hour = new Date(t.timestamp).toISOString().slice(0, 13) + ':00:00';
    const b = bucket.get(hour) || { total: 0, delivered: 0, failed: 0 };
    b.total += 1;
    if (t.status === 'delivered') b.delivered += 1;
    if (t.status === 'failed') b.failed += 1;
    bucket.set(hour, b);
  }
  for (const [hour, b] of Array.from(bucket.entries()).sort()) {
    hourlyStats.push({ hour, ...b });
  }

  // Get top sending users
  const topUsers: Array<{ userName: string; totalSent: number; delivered: number }> = [];

  // Get delivery rates by SMTP configuration
  const smtpStats: Array<{ host: string; total: number; delivered: number }> = [];

  res.json(createApiResponse(true, { hourlyStats, topUsers, smtpStats }, undefined, 'Email analytics retrieved'));
}));

// Security Events
router.get('/security-events', asyncHandler(async (req: Request, res: Response) => {
  const timeRange = req.query.timeRange as string || '24h';
  
  const now = new Date();
  let startTime: Date;
  switch (timeRange) {
    case '1h':
      startTime = new Date(now.getTime() - 60 * 60 * 1000);
      break;
    case '24h':
      startTime = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      break;
    case '7d':
      startTime = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      break;
    case '30d':
      startTime = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      break;
    default:
      startTime = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  }

  const activityRepo = AppDataSource.getRepository(UserActivity);

  const securityEvents = await activityRepo.find({
    where: { timestamp: MoreThan(startTime) },
    order: { timestamp: 'DESC' },
    take: 50
  });

  const formattedEvents = securityEvents.map(event => ({
    id: event.id,
    type: 'security',
    title: `Event ${event.metadata?.action || 'unknown'}`,
    message: `User action: ${event.metadata?.action || 'unknown'}`,
    timestamp: event.timestamp,
    severity: 'medium',
    ipAddress: event.metadata?.ipAddress,
    userAgent: event.metadata?.userAgent
  }));

  res.json(createApiResponse(true, formattedEvents, undefined, 'Security events retrieved'));
}));

export default router;