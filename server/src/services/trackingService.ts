import { EmailTracking, SmtpConfiguration } from '../entities';
import { AppDataSource } from '../data-source';
import { EmailData } from '../types';
import { SentMessageInfo } from 'nodemailer';

export class TrackingService {
  public async saveEmailTracking(
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
      smtpConfigId: smtpConfig.id
    });

    const savedTracking = await trackingRepo.save(tracking);
    return savedTracking.id;
  }

  public async updateSmtpStats(smtpConfig: SmtpConfiguration, success: boolean): Promise<void> {
    const smtpRepo = AppDataSource.getRepository(SmtpConfiguration);

    if (success) {
      smtpConfig.currentEmailsSent = (smtpConfig.currentEmailsSent || 0) + 1;
      smtpConfig.lastUsed = new Date();
    }

    await smtpRepo.save(smtpConfig);
  }

  public async getTrackingStats(timeRange: '1d' | '7d' | '30d' | '90d' = '7d'): Promise<any> {
    const trackingRepo = AppDataSource.getRepository(EmailTracking);

    const now = new Date();
    const timeRanges = {
      '1d': new Date(now.getTime() - 24 * 60 * 60 * 1000),
      '7d': new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000),
      '30d': new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000),
      '90d': new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000)
    };

    const startDate = timeRanges[timeRange];

    const { MoreThan } = await import('typeorm');
    const [total, delivered, failed] = await Promise.all([
      trackingRepo.count({ where: { timestamp: MoreThan(startDate) } }),
      trackingRepo.count({ where: { timestamp: MoreThan(startDate), status: 'delivered' } }),
      trackingRepo.count({ where: { timestamp: MoreThan(startDate), status: 'failed' } })
    ]);

    return {
      total,
      delivered,
      failed,
      successRate: total > 0 ? Math.round((delivered / total) * 100) : 0,
      timeRange
    };
  }

  public async getRecentActivity(limit: number = 50): Promise<EmailTracking[]> {
    const trackingRepo = AppDataSource.getRepository(EmailTracking);

    return trackingRepo.find({
      order: { timestamp: 'DESC' },
      take: limit
    });
  }
}
