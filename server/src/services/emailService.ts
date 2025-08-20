import nodemailer, { Transporter, SentMessageInfo, TransportOptions } from 'nodemailer';
import { SmtpConfiguration, EmailTracking } from '../entities';
import { AppDataSource } from '../data-source';
import { EmailData } from '../types';
import { createApiResponse } from '../middleware/validation';
import { validateSmtpConfig } from '../utils/smtp';

interface EmailResult {
  success: boolean;
  messageId?: string;
  error?: string;
  usedConfig?: SmtpConfiguration;
  trackingId?: string;
}

interface EmailBatchResult {
  total: number;
  sent: number;
  failed: number;
  results: EmailResult[];
}

interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  body: string;
  isHtml: boolean;
  variables: string[];
}

class EmailService {
  private transporterPool: Map<string, Transporter> = new Map();
  private emailTemplates: Map<string, EmailTemplate> = new Map();

  constructor() {
    this.initializeTemplates();
  }

  // Initialize email templates
  private initializeTemplates(): void {
    const templates: EmailTemplate[] = [
      {
        id: 'welcome',
        name: 'Welcome Email',
        subject: 'Welcome to {{company}}!',
        body: `
          <h1>Welcome to {{company}}!</h1>
          <p>Hi {{name}},</p>
          <p>Thank you for joining us. We're excited to have you on board!</p>
          <p>Best regards,<br>The {{company}} Team</p>
        `,
        isHtml: true,
        variables: ['company', 'name']
      },
      {
        id: 'newsletter',
        name: 'Newsletter Template',
        subject: '{{company}} Newsletter - {{date}}',
        body: `
          <h1>{{company}} Newsletter</h1>
          <p>Hi {{name}},</p>
          <p>{{content}}</p>
          <p>Best regards,<br>The {{company}} Team</p>
        `,
        isHtml: true,
        variables: ['company', 'name', 'date', 'content']
      },
      {
        id: 'promotional',
        name: 'Promotional Email',
        subject: '{{offer}} - Limited Time Only!',
        body: `
          <h1>{{offer}}</h1>
          <p>Hi {{name}},</p>
          <p>{{description}}</p>
          <p><strong>Valid until: {{expiryDate}}</strong></p>
          <p>Best regards,<br>The {{company}} Team</p>
        `,
        isHtml: true,
        variables: ['offer', 'name', 'description', 'expiryDate', 'company']
      }
    ];

    templates.forEach(template => {
      this.emailTemplates.set(template.id, template);
    });
  }

  // Get or create SMTP transporter
  private async getTransporter(config: SmtpConfiguration): Promise<Transporter> {
    const key = `${config.host}:${config.port}:${config.username}`;
    
    if (this.transporterPool.has(key)) {
      return this.transporterPool.get(key)!;
    }

    const transporter = nodemailer.createTransporter({
      host: config.host,
      port: typeof config.port === 'string' ? parseInt(config.port) : config.port,
      secure: config.port === 465 || config.secure,
      auth: {
        user: config.username,
        pass: config.password,
      },
      pool: true,
      maxConnections: 5,
      maxMessages: 100,
      rateLimit: 14, // 14 messages per second
      rateDelta: 1000, // 1 second
    } as TransportOptions);

    // Verify connection
    try {
      await transporter.verify();
      this.transporterPool.set(key, transporter);
      return transporter;
    } catch (error) {
      throw new Error(`SMTP connection failed for ${config.host}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Send a single email
  async sendEmail(emailData: EmailData, smtpConfig: SmtpConfiguration): Promise<EmailResult> {
    try {
      // Validate SMTP configuration
      const validation = await validateSmtpConfig(smtpConfig);
      if (!validation.success) {
        throw new Error(`SMTP validation failed: ${validation.error}`);
      }

      // Get transporter
      const transporter = await this.getTransporter(smtpConfig);

      // Prepare email options
      const mailOptions = {
        from: smtpConfig.fromEmail || smtpConfig.username,
        to: emailData.to,
        subject: emailData.subject,
        text: emailData.isHtml ? undefined : emailData.body,
        html: emailData.isHtml ? emailData.body : undefined,
        cc: emailData.cc,
        bcc: emailData.bcc,
        replyTo: emailData.replyTo,
        attachments: emailData.attachments?.map(attachment => ({
          filename: attachment.name,
          content: attachment,
          contentType: attachment.type
        }))
      };

      // Send email
      const info: SentMessageInfo = await transporter.sendMail(mailOptions);
      
      if (!info.messageId) {
        throw new Error('No message ID returned from SMTP server');
      }

      // Save tracking information
      const trackingId = await this.saveEmailTracking(emailData, smtpConfig, info, 'delivered');

      // Update SMTP configuration stats
      await this.updateSmtpStats(smtpConfig, true);

      return {
        success: true,
        messageId: info.messageId,
        usedConfig: smtpConfig,
        trackingId
      };

    } catch (error) {
      // Save failed tracking
      await this.saveEmailTracking(emailData, smtpConfig, null, 'failed', error instanceof Error ? error.message : 'Unknown error');
      
      // Update SMTP configuration stats
      await this.updateSmtpStats(smtpConfig, false);

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        usedConfig: smtpConfig
      };
    }
  }

  // Send bulk emails with rate limiting and retry logic
  async sendBulkEmails(
    emails: EmailData[],
    smtpConfigs: SmtpConfiguration[],
    options: {
      batchSize?: number;
      delayBetweenBatches?: number;
      retryAttempts?: number;
      retryDelay?: number;
    } = {}
  ): Promise<EmailBatchResult> {
    const {
      batchSize = 50,
      delayBetweenBatches = 2000,
      retryAttempts = 3,
      retryDelay = 5000
    } = options;

    const results: EmailResult[] = [];
    let sent = 0;
    let failed = 0;

    // Process emails in batches
    for (let i = 0; i < emails.length; i += batchSize) {
      const batch = emails.slice(i, i + batchSize);
      
      // Process batch with retry logic
      for (const email of batch) {
        let lastError: string | undefined;
        
        // Try each SMTP configuration
        for (const smtpConfig of smtpConfigs) {
          for (let attempt = 1; attempt <= retryAttempts; attempt++) {
            try {
              const result = await this.sendEmail(email, smtpConfig);
              
              if (result.success) {
                results.push(result);
                sent++;
                break; // Success, move to next email
              } else {
                lastError = result.error;
                
                if (attempt < retryAttempts) {
                  await new Promise(resolve => setTimeout(resolve, retryDelay));
                }
              }
            } catch (error) {
              lastError = error instanceof Error ? error.message : 'Unknown error';
              
              if (attempt < retryAttempts) {
                await new Promise(resolve => setTimeout(resolve, retryDelay));
              }
            }
          }
        }
        
        // If all attempts failed
        if (!results[results.length - 1]?.success) {
          results.push({
            success: false,
            error: lastError || 'All SMTP configurations failed',
            usedConfig: smtpConfigs[0]
          });
          failed++;
        }
      }
      
      // Delay between batches
      if (i + batchSize < emails.length) {
        await new Promise(resolve => setTimeout(resolve, delayBetweenBatches));
      }
    }

    return {
      total: emails.length,
      sent,
      failed,
      results
    };
  }

  // Send email using template
  async sendTemplatedEmail(
    templateId: string,
    variables: Record<string, string>,
    recipient: string,
    smtpConfig: SmtpConfiguration,
    customSubject?: string,
    customBody?: string
  ): Promise<EmailResult> {
    const template = this.emailTemplates.get(templateId);
    if (!template) {
      throw new Error(`Email template '${templateId}' not found`);
    }

    // Replace variables in template
    let subject = customSubject || template.subject;
    let body = customBody || template.body;

    for (const [key, value] of Object.entries(variables)) {
      const regex = new RegExp(`{{${key}}}`, 'g');
      subject = subject.replace(regex, value);
      body = body.replace(regex, value);
    }

    const emailData: EmailData = {
      to: recipient,
      subject,
      body,
      isHtml: template.isHtml
    };

    return this.sendEmail(emailData, smtpConfig);
  }

  // Save email tracking information
  private async saveEmailTracking(
    emailData: EmailData,
    smtpConfig: SmtpConfiguration,
    info: SentMessageInfo | null,
    status: 'delivered' | 'failed',
    error?: string
  ): Promise<string> {
    const trackingRepo = AppDataSource.getRepository(EmailTracking);
    
    const tracking = trackingRepo.create({
      email: emailData.to,
      subject: emailData.subject,
      status,
      details: info ? `Message ID: ${info.messageId}` : error || 'Unknown error',
      smtpConfigId: smtpConfig.id,
      sentAt: new Date(),
      messageId: info?.messageId
    });

    const savedTracking = await trackingRepo.save(tracking);
    return savedTracking.id;
  }

  // Update SMTP configuration statistics
  private async updateSmtpStats(smtpConfig: SmtpConfiguration, success: boolean): Promise<void> {
    const smtpRepo = AppDataSource.getRepository(SmtpConfiguration);
    
    if (success) {
      smtpConfig.currentEmailsSent = (smtpConfig.currentEmailsSent || 0) + 1;
      smtpConfig.lastUsed = new Date();
    }
    
    await smtpRepo.save(smtpConfig);
  }

  // Get email templates
  getTemplates(): EmailTemplate[] {
    return Array.from(this.emailTemplates.values());
  }

  // Get template by ID
  getTemplate(templateId: string): EmailTemplate | undefined {
    return this.emailTemplates.get(templateId);
  }

  // Add custom template
  addTemplate(template: EmailTemplate): void {
    this.emailTemplates.set(template.id, template);
  }

  // Remove template
  removeTemplate(templateId: string): boolean {
    return this.emailTemplates.delete(templateId);
  }

  // Get email tracking statistics
  async getTrackingStats(timeRange: '1d' | '7d' | '30d' | '90d' = '7d'): Promise<any> {
    const trackingRepo = AppDataSource.getRepository(EmailTracking);
    
    const now = new Date();
    const timeRanges = {
      '1d': new Date(now.getTime() - 24 * 60 * 60 * 1000),
      '7d': new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000),
      '30d': new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000),
      '90d': new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000)
    };

    const startDate = timeRanges[timeRange];

    const [total, delivered, failed] = await Promise.all([
      trackingRepo.count({ where: { sentAt: { $gte: startDate } } }),
      trackingRepo.count({ where: { sentAt: { $gte: startDate }, status: 'delivered' } }),
      trackingRepo.count({ where: { sentAt: { $gte: startDate }, status: 'failed' } })
    ]);

    return {
      total,
      delivered,
      failed,
      successRate: total > 0 ? Math.round((delivered / total) * 100) : 0,
      timeRange
    };
  }

  // Get recent email activity
  async getRecentActivity(limit: number = 50): Promise<EmailTracking[]> {
    const trackingRepo = AppDataSource.getRepository(EmailTracking);
    
    return trackingRepo.find({
      order: { sentAt: 'DESC' },
      take: limit,
      relations: ['smtpConfiguration']
    });
  }

  // Clean up transporters
  async cleanup(): Promise<void> {
    for (const transporter of this.transporterPool.values()) {
      try {
        await transporter.close();
      } catch (error) {
        console.error('Error closing transporter:', error);
      }
    }
    this.transporterPool.clear();
  }
}

export const emailService = new EmailService();