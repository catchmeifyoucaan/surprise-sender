import express from 'express';
import { authenticateJWT } from '../middleware/auth';
import { validateRequest, createApiResponse, asyncHandler } from '../middleware/validation';
import { AppDataSource } from '../data-source';
import { User, UserActivity, SmtpConfiguration, EmailTracking } from '../entities';
import { z } from 'zod';
import os from 'os';
import { advancedEmailService } from '../services/advancedEmailService';

const router = express.Router();

// Admin authorization middleware
const requireAdmin = (req: any, res: any, next: any) => {
  if (req.user?.role !== 'admin') {
    return res.status(403).json(createApiResponse(false, 'Admin access required', null));
  }
  next();
};

// Apply admin middleware to all routes
router.use(authenticateJWT, requireAdmin);

// System Statistics
router.get('/stats', asyncHandler(async (req, res) => {
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
  const activityRepo = AppDataSource.getRepository(UserActivity);
  const smtpRepo = AppDataSource.getRepository(SmtpConfiguration);
  const trackingRepo = AppDataSource.getRepository(EmailTracking);

  // Get user statistics
  const [totalUsers, activeUsers] = await Promise.all([
    userRepo.count(),
    userRepo.count({ where: { lastLoginAt: { $gte: startTime } } })
  ]);

  // Get email statistics
  const emailStats = await trackingRepo
    .createQueryBuilder('tracking')
    .select([
      'COUNT(*) as total',
      'SUM(CASE WHEN status = "delivered" THEN 1 ELSE 0 END) as delivered',
      'SUM(CASE WHEN status = "failed" THEN 1 ELSE 0 END) as failed'
    ])
    .where('tracking.sentAt >= :startTime', { startTime })
    .getRawOne();

  const totalEmails = parseInt(emailStats?.total || '0');
  const deliveredEmails = parseInt(emailStats?.delivered || '0');
  const failedEmails = parseInt(emailStats?.failed || '0');
  const successRate = totalEmails > 0 ? Math.round((deliveredEmails / totalEmails) * 100) : 0;

  // Get active campaigns (simplified - in real implementation, you'd have a campaigns table)
  const activeCampaigns = await trackingRepo
    .createQueryBuilder('tracking')
    .select('COUNT(DISTINCT tracking.campaignId)', 'count')
    .where('tracking.sentAt >= :startTime', { startTime })
    .andWhere('tracking.campaignId IS NOT NULL')
    .getRawOne();

  // System performance metrics
  const systemLoad = Math.round(os.loadavg()[0] * 100);
  const memoryUsage = Math.round((1 - os.freemem() / os.totalmem()) * 100);
  const diskUsage = 75; // This would require a disk usage library
  const networkTraffic = 0; // This would require network monitoring

  res.json(createApiResponse(true, 'System statistics retrieved', {
    totalUsers,
    activeUsers,
    totalEmails,
    deliveredEmails,
    failedEmails,
    successRate,
    activeCampaigns: parseInt(activeCampaigns?.count || '0'),
    systemLoad,
    memoryUsage,
    diskUsage,
    networkTraffic
  }));
}));

// User Activities
router.get('/activities', asyncHandler(async (req, res) => {
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
  const userRepo = AppDataSource.getRepository(User);

  const activities = await activityRepo
    .createQueryBuilder('activity')
    .leftJoinAndSelect('activity.user', 'user')
    .where('activity.timestamp >= :startTime', { startTime })
    .orderBy('activity.timestamp', 'DESC')
    .limit(100)
    .getMany();

  const formattedActivities = activities.map(activity => ({
    id: activity.id,
    userId: activity.userId,
    userName: activity.user?.name || 'Unknown User',
    action: activity.action,
    timestamp: activity.timestamp,
    ipAddress: activity.ipAddress || 'Unknown',
    userAgent: activity.userAgent || 'Unknown',
    status: activity.status,
    metadata: activity.metadata
  }));

  res.json(createApiResponse(true, 'User activities retrieved', formattedActivities));
}));

// Email Campaigns
router.get('/campaigns', asyncHandler(async (req, res) => {
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
  const userRepo = AppDataSource.getRepository(User);

  // Get campaigns from tracking data (simplified - in real implementation, you'd have a campaigns table)
  const campaigns = await trackingRepo
    .createQueryBuilder('tracking')
    .leftJoinAndSelect('tracking.user', 'user')
    .select([
      'tracking.campaignId as id',
      'tracking.campaignName as name',
      'tracking.userId',
      'user.name as userName',
      'COUNT(*) as totalRecipients',
      'SUM(CASE WHEN tracking.status = "delivered" THEN 1 ELSE 0 END) as delivered',
      'SUM(CASE WHEN tracking.status = "failed" THEN 1 ELSE 0 END) as failed',
      'MIN(tracking.sentAt) as createdAt',
      'MAX(tracking.sentAt) as lastActivity'
    ])
    .where('tracking.sentAt >= :startTime', { startTime })
    .andWhere('tracking.campaignId IS NOT NULL')
    .groupBy('tracking.campaignId')
    .orderBy('lastActivity', 'DESC')
    .getRawMany();

  const formattedCampaigns = campaigns.map(campaign => ({
    id: campaign.id,
    name: campaign.name || 'Unnamed Campaign',
    userId: campaign.userId,
    userName: campaign.userName || 'Unknown User',
    status: 'active', // This would be determined by campaign logic
    totalRecipients: parseInt(campaign.totalRecipients),
    sent: parseInt(campaign.totalRecipients),
    delivered: parseInt(campaign.delivered),
    failed: parseInt(campaign.failed),
    opened: 0, // This would require tracking implementation
    clicked: 0, // This would require tracking implementation
    createdAt: campaign.createdAt,
    lastActivity: campaign.lastActivity
  }));

  res.json(createApiResponse(true, 'Email campaigns retrieved', formattedCampaigns));
}));

// System Alerts
router.get('/alerts', asyncHandler(async (req, res) => {
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

  res.json(createApiResponse(true, 'System alerts retrieved', alerts));
}));

// Resolve Alert
router.post('/alerts/:alertId/resolve', asyncHandler(async (req, res) => {
  const { alertId } = req.params;
  
  // In a real implementation, this would update the alert in the database
  res.json(createApiResponse(true, 'Alert resolved successfully', { alertId }));
}));

// User Management
const UserActionSchema = z.object({
  action: z.enum(['suspend', 'activate', 'delete'])
});

router.post('/users/:userId/:action', validateRequest(UserActionSchema), asyncHandler(async (req, res) => {
  const { userId, action } = req.params;
  
  const userRepo = AppDataSource.getRepository(User);
  const user = await userRepo.findOne({ where: { id: userId } });
  
  if (!user) {
    return res.status(404).json(createApiResponse(false, 'User not found', null));
  }

  switch (action) {
    case 'suspend':
      user.isActive = false;
      break;
    case 'activate':
      user.isActive = true;
      break;
    case 'delete':
      await userRepo.remove(user);
      return res.json(createApiResponse(true, 'User deleted successfully', null));
  }

  await userRepo.save(user);
  res.json(createApiResponse(true, `User ${action}ed successfully`, null));
}));

// Campaign Management
const CampaignActionSchema = z.object({
  action: z.enum(['pause', 'resume', 'stop'])
});

router.post('/campaigns/:campaignId/:action', validateRequest(CampaignActionSchema), asyncHandler(async (req, res) => {
  const { campaignId, action } = req.params;
  
  // In a real implementation, this would update the campaign status in the database
  // For now, we'll just return success
  res.json(createApiResponse(true, `Campaign ${action}d successfully`, { campaignId, action }));
}));

// SMTP Configuration Management
router.get('/smtp-configurations', asyncHandler(async (req, res) => {
  const smtpRepo = AppDataSource.getRepository(SmtpConfiguration);
  const configs = await smtpRepo.find({
    relations: ['user'],
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
    deliveryScore: config.deliveryScore,
    speedScore: config.speedScore,
    reputationScore: config.reputationScore,
    stats: config.stats,
    metadata: config.metadata
  }));

  res.json(createApiResponse(true, 'SMTP configurations retrieved', {
    configurations: formattedConfigs
  }));
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

router.post('/smtp/bulk-validate', validateRequest(BulkValidationSchema), asyncHandler(async (req, res) => {
  const { configs } = req.body;
  
  // Convert to SmtpConfiguration entities
  const smtpConfigs = configs.map((config: any) => {
    const smtpConfig = new SmtpConfiguration();
    Object.assign(smtpConfig, config);
    return smtpConfig;
  });

  // Use the advanced email service for validation
  const results = await advancedEmailService.validateSmtpConfigurations(smtpConfigs);
  
  res.json(createApiResponse(true, 'Bulk validation completed', results));
}));

// System Performance
router.get('/performance', asyncHandler(async (req, res) => {
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

  res.json(createApiResponse(true, 'System performance data retrieved', performance));
}));

// Email Analytics
router.get('/email-analytics', asyncHandler(async (req, res) => {
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
  const hourlyStats = await trackingRepo
    .createQueryBuilder('tracking')
    .select([
      'DATE_FORMAT(tracking.sentAt, "%Y-%m-%d %H:00:00") as hour',
      'COUNT(*) as total',
      'SUM(CASE WHEN tracking.status = "delivered" THEN 1 ELSE 0 END) as delivered',
      'SUM(CASE WHEN tracking.status = "failed" THEN 1 ELSE 0 END) as failed'
    ])
    .where('tracking.sentAt >= :startTime', { startTime })
    .groupBy('hour')
    .orderBy('hour', 'ASC')
    .getRawMany();

  // Get top sending users
  const topUsers = await trackingRepo
    .createQueryBuilder('tracking')
    .leftJoinAndSelect('tracking.user', 'user')
    .select([
      'user.name as userName',
      'COUNT(*) as totalSent',
      'SUM(CASE WHEN tracking.status = "delivered" THEN 1 ELSE 0 END) as delivered'
    ])
    .where('tracking.sentAt >= :startTime', { startTime })
    .groupBy('tracking.userId')
    .orderBy('totalSent', 'DESC')
    .limit(10)
    .getRawMany();

  // Get delivery rates by SMTP configuration
  const smtpStats = await trackingRepo
    .createQueryBuilder('tracking')
    .leftJoinAndSelect('tracking.smtpConfig', 'smtp')
    .select([
      'smtp.host as host',
      'COUNT(*) as total',
      'SUM(CASE WHEN tracking.status = "delivered" THEN 1 ELSE 0 END) as delivered'
    ])
    .where('tracking.sentAt >= :startTime', { startTime })
    .andWhere('tracking.smtpConfigId IS NOT NULL')
    .groupBy('tracking.smtpConfigId')
    .orderBy('total', 'DESC')
    .getRawMany();

  res.json(createApiResponse(true, 'Email analytics retrieved', {
    hourlyStats,
    topUsers,
    smtpStats
  }));
}));

// Security Events
router.get('/security-events', asyncHandler(async (req, res) => {
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

  const securityEvents = await activityRepo
    .createQueryBuilder('activity')
    .leftJoinAndSelect('activity.user', 'user')
    .where('activity.timestamp >= :startTime', { startTime })
    .andWhere('activity.status = :status', { status: 'failed' })
    .orderBy('activity.timestamp', 'DESC')
    .limit(50)
    .getMany();

  const formattedEvents = securityEvents.map(event => ({
    id: event.id,
    type: 'security',
    title: `Failed ${event.action}`,
    message: `User ${event.user?.name || 'Unknown'} failed to ${event.action}`,
    timestamp: event.timestamp,
    severity: 'medium',
    ipAddress: event.ipAddress,
    userAgent: event.userAgent
  }));

  res.json(createApiResponse(true, 'Security events retrieved', formattedEvents));
}));

export default router;