import { Router } from 'express';
import type { ValidatedRequest } from '../middleware/validation';
import { validateRequest, asyncHandler, createApiResponse } from '../middleware/validation';
import { SendEmailSchema, SmtpValidationSchema } from '../validation/schemas';
import { authenticateJWT } from '../middleware/auth';
import { AppDataSource } from '../data-source';
import { SmtpConfiguration } from '../entities';
import { container } from '../container';
import { validateSmtpConfig } from '../utils/smtp';

const router = Router();
const emailService = container.emailService;
const jobService = container.jobService;

router.use(authenticateJWT);

router.post('/send',
  validateRequest(SendEmailSchema),
  asyncHandler(async (req: ValidatedRequest<any>, res) => {
    const { emailData, smtpConfigs } = req.validatedBody!;
    const configs = Array.isArray(smtpConfigs) ? smtpConfigs : [smtpConfigs];

    for (const config of configs) {
      const result = await emailService.sendEmail(emailData, config);
      if (result.success) {
        return res.json(createApiResponse(true, result, undefined, 'Email sent successfully'));
      }
    }

    res.status(500).json(createApiResponse(false, undefined, 'Failed to send email with all SMTP configurations'));
  })
);

router.post('/send-bulk',
  asyncHandler(async (req, res) => {
    const { emails, smtpConfigs } = req.body;
    await jobService.addBulkEmailJob(emails, smtpConfigs);
    res.json(createApiResponse(true, { message: "Bulk email sending job started." }, undefined, 'Bulk email operation completed'));
  })
);

router.post('/send-template',
  asyncHandler(async (req, res) => {
    const { templateId, variables, recipient, smtpConfigId, customSubject, customBody } = req.body;
    const smtpRepo = AppDataSource.getRepository(SmtpConfiguration);
    const smtpConfig = await smtpRepo.findOne({ where: { id: smtpConfigId } });

    if (!smtpConfig) {
      return res.status(404).json(createApiResponse(false, undefined, 'SMTP configuration not found'));
    }

    const result = await emailService.sendTemplatedEmail(templateId, variables, recipient, smtpConfig, customSubject, customBody);
    res.json(createApiResponse(result.success, result, undefined, result.success ? 'Templated email sent successfully' : result.error));
  })
);

router.post('/validate-smtp',
  validateRequest(SmtpValidationSchema),
  asyncHandler(async (req: ValidatedRequest<any>, res) => {
    const { configs } = req.validatedBody!;
    const results = await Promise.all(
      configs.map(async (config: SmtpConfiguration) => {
        const validation = await validateSmtpConfig(config);
        return {
          id: config.id,
          host: config.host,
          success: validation.success,
          error: validation.error
        };
      })
    );
    res.json(createApiResponse(true, { results }, undefined, 'SMTP validation completed'));
  })
);

router.get('/templates',
  asyncHandler(async (req, res) => {
    const templates = await emailService.getTemplates();
    res.json(createApiResponse(true, templates, undefined, 'Templates retrieved successfully'));
  })
);

router.post('/send-contextual',
  asyncHandler(async (req, res) => {
    const { baseContent, recipientMetadata, smtpConfigId, crewId, usePhoneticName } = req.body;
    const smtpRepo = AppDataSource.getRepository(SmtpConfiguration);
    const smtpConfig = await smtpRepo.findOne({ where: { id: smtpConfigId } });

    if (!smtpConfig) {
      return res.status(404).json(createApiResponse(false, undefined, 'SMTP configuration not found'));
    }

    const result = await emailService.sendContextualEmail(baseContent, recipientMetadata, smtpConfig, crewId, usePhoneticName);
    res.json(createApiResponse(result.success, result, undefined, result.success ? 'Contextual email sent successfully' : result.error));
  })
);

router.get('/stats',
  asyncHandler(async (req, res) => {
    const { timeRange = '7d' } = req.query;
    const stats = await container.trackingService.getTrackingStats(timeRange as '1d' | '7d' | '30d' | '90d');
    res.json(createApiResponse(true, stats, undefined, 'Statistics retrieved successfully'));
  })
);

router.get('/activity',
  asyncHandler(async (req, res) => {
    const { limit = 50 } = req.query;
    const activity = await container.trackingService.getRecentActivity(Number(limit));
    res.json(createApiResponse(true, activity, undefined, 'Activity retrieved successfully'));
  })
);

export default router;
