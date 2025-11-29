import { SmtpConfiguration } from '../entities';
import { EmailData } from '../types';
import { SmtpService } from './smtpService';
import { TemplateService, EmailTemplate } from './templateService';
import { TrackingService } from './trackingService';
import { JobService } from './jobService';
import { validateSmtpConfig } from '../utils/smtp';

interface EmailResult {
  success: boolean;
  messageId?: string;
  error?: string;
  usedConfig?: SmtpConfiguration;
  trackingId?: string;
}

export class EmailService {
  private jobService: JobService;

  constructor(
    private smtpService: SmtpService,
    private templateService: TemplateService,
    private trackingService: TrackingService
  ) {}

  public setJobService(jobService: JobService) {
    this.jobService = jobService;
  }

  public async sendEmail(emailData: EmailData, smtpConfig: SmtpConfiguration): Promise<EmailResult> {
    try {
      const validation = await validateSmtpConfig(smtpConfig);
      if (!validation.success) {
        throw new Error(`SMTP validation failed: ${validation.error}`);
      }

      const transporter = await this.smtpService.getTransporter(smtpConfig);

      const mailOptions: import('nodemailer').SendMailOptions = {
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
          content: (attachment as any).content,
          contentType: attachment.type
        }))
      };

      const info = await transporter.sendMail(mailOptions);

      if (!info.messageId) {
        throw new Error('No message ID returned from SMTP server');
      }

      const trackingId = await this.trackingService.saveEmailTracking(emailData, smtpConfig, info, 'delivered');
      await this.trackingService.updateSmtpStats(smtpConfig, true);

      return {
        success: true,
        messageId: info.messageId,
        usedConfig: smtpConfig,
        trackingId
      };
    } catch (error) {
      await this.trackingService.saveEmailTracking(emailData, smtpConfig, null, 'failed', error instanceof Error ? error.message : 'Unknown error');
      await this.trackingService.updateSmtpStats(smtpConfig, false);

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        usedConfig: smtpConfig
      };
    }
  }

  public async sendBulkEmail(emails: EmailData[], smtpConfigs: SmtpConfiguration[]): Promise<void> {
    await this.jobService.addBulkEmailJob(emails, smtpConfigs);
  }

  public async sendTemplatedEmail(
    templateId: string,
    variables: Record<string, string>,
    recipient: string,
    smtpConfig: SmtpConfiguration,
    customSubject?: string,
    customBody?: string
  ): Promise<EmailResult> {
    const template = await this.templateService.getTemplate(templateId);
    if (!template) {
      throw new Error(`Email template '${templateId}' not found`);
    }

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

  public async getTemplates(): Promise<EmailTemplate[]> {
    return this.templateService.getTemplates();
  }

  public async sendContextualEmail(
    baseContent: EmailData,
    recipientMetadata: { name: string; company?: string; jobTitle?: string },
    smtpConfig: SmtpConfiguration,
    crewId: string,
    usePhoneticName: boolean = false
  ): Promise<EmailResult> {
    try {
      // Lazy import agentService to avoid circular dependency issues
      const { agentService } = await import('./agentService');

      const contextualEmailData = await agentService.generateContextualEmail(
        crewId,
        baseContent,
        recipientMetadata,
        usePhoneticName
      );

      return this.sendEmail(contextualEmailData, smtpConfig);
    } catch (error) {
      return {
        success: false,
        error: `Contextual email generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        usedConfig: smtpConfig
      };
    }
  }
}
