import { Router } from 'express';
import { validateRequest, asyncHandler, createApiResponse } from '../middleware/validation';
import { SendEmailSchema, SmtpValidationSchema } from '../validation/schemas';
import { emailService } from '../services/emailService';
import { authenticateJWT } from '../middleware/auth';
import { AppDataSource } from '../data-source';
import { SmtpConfiguration } from '../entities';

const router = Router();

// Apply authentication to all routes
router.use(authenticateJWT);

// Send single email
router.post('/send', 
  validateRequest(SendEmailSchema),
  asyncHandler(async (req, res) => {
    const { emailData, smtpConfigs } = req.validatedBody!;
    
    const configs = Array.isArray(smtpConfigs) ? smtpConfigs : [smtpConfigs];
    
    // Try each SMTP configuration until one succeeds
    for (const config of configs) {
      try {
        const result = await emailService.sendEmail(emailData, config);
        
        if (result.success) {
          return res.json(createApiResponse(true, result, undefined, 'Email sent successfully'));
        }
      } catch (error) {
        console.error(`Failed to send email with config ${config.host}:`, error);
        continue;
      }
    }
    
    return res.status(500).json(createApiResponse(false, undefined, 'Failed to send email with all SMTP configurations'));
  })
);

// Send bulk emails
router.post('/send-bulk',
  asyncHandler(async (req, res) => {
    const { emails, smtpConfigs, options } = req.body;
    
    if (!emails || !Array.isArray(emails) || emails.length === 0) {
      return res.status(400).json(createApiResponse(false, undefined, 'Emails array is required'));
    }
    
    if (!smtpConfigs || !Array.isArray(smtpConfigs) || smtpConfigs.length === 0) {
      return res.status(400).json(createApiResponse(false, undefined, 'SMTP configurations are required'));
    }
    
    try {
      const result = await emailService.sendBulkEmails(emails, smtpConfigs, options);
      return res.json(createApiResponse(true, result, undefined, 'Bulk email operation completed'));
    } catch (error) {
      return res.status(500).json(createApiResponse(false, undefined, error instanceof Error ? error.message : 'Bulk email failed'));
    }
  })
);

// Send templated email
router.post('/send-template',
  asyncHandler(async (req, res) => {
    const { templateId, variables, recipient, smtpConfigId, customSubject, customBody } = req.body;
    
    if (!templateId || !variables || !recipient || !smtpConfigId) {
      return res.status(400).json(createApiResponse(false, undefined, 'Missing required fields'));
    }
    
    try {
      const smtpRepo = AppDataSource.getRepository(SmtpConfiguration);
      const smtpConfig = await smtpRepo.findOne({ where: { id: smtpConfigId } });
      
      if (!smtpConfig) {
        return res.status(404).json(createApiResponse(false, undefined, 'SMTP configuration not found'));
      }
      
      const result = await emailService.sendTemplatedEmail(
        templateId,
        variables,
        recipient,
        smtpConfig,
        customSubject,
        customBody
      );
      
      if (result.success) {
        return res.json(createApiResponse(true, result, undefined, 'Templated email sent successfully'));
      } else {
        return res.status(500).json(createApiResponse(false, undefined, result.error));
      }
    } catch (error) {
      return res.status(500).json(createApiResponse(false, undefined, error instanceof Error ? error.message : 'Failed to send templated email'));
    }
  })
);

// Validate SMTP configurations
router.post('/validate-smtp',
  validateRequest(SmtpValidationSchema),
  asyncHandler(async (req, res) => {
    const { configs } = req.validatedBody!;
    
    const results = await Promise.all(
      configs.map(async (config) => {
        try {
          const validation = await emailService.validateSmtpConfig(config);
          return {
            id: config.id,
            host: config.host,
            success: validation.success,
            error: validation.error
          };
        } catch (error) {
          return {
            id: config.id,
            host: config.host,
            success: false,
            error: error instanceof Error ? error.message : 'Validation failed'
          };
        }
      })
    );
    
    return res.json(createApiResponse(true, { results }, undefined, 'SMTP validation completed'));
  })
);

// Get email templates
router.get('/templates',
  asyncHandler(async (req, res) => {
    const templates = emailService.getTemplates();
    return res.json(createApiResponse(true, templates, undefined, 'Templates retrieved successfully'));
  })
);

// Get email tracking statistics
router.get('/stats',
  asyncHandler(async (req, res) => {
    const { timeRange = '7d' } = req.query;
    const stats = await emailService.getTrackingStats(timeRange as '1d' | '7d' | '30d' | '90d');
    return res.json(createApiResponse(true, stats, undefined, 'Statistics retrieved successfully'));
  })
);

// Get recent email activity
router.get('/activity',
  asyncHandler(async (req, res) => {
    const { limit = 50 } = req.query;
    const activity = await emailService.getRecentActivity(Number(limit));
    return res.json(createApiResponse(true, activity, undefined, 'Activity retrieved successfully'));
  })
);

export default router;