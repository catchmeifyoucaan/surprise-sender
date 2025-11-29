import { Queue, Worker } from 'bullmq';
import { EmailService } from './emailService';
import { EmailData } from '../types';
import { SmtpConfiguration } from '../entities';
import { container } from '../container';

const connection = {
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
};

export class JobService {
  private emailQueue: Queue;

  constructor(private emailService: EmailService) {
    this.emailQueue = new Queue('email', { connection });
    this.createWorker();
  }

  public async addBulkEmailJob(emails: EmailData[], smtpConfigs: SmtpConfiguration[]): Promise<void> {
    await this.emailQueue.add('send-bulk-email', { emails, smtpConfigs });
  }

  private createWorker(): void {
    new Worker('email', async (job) => {
      const { emails, smtpConfigs } = job.data;
      for (const email of emails) {
        for (const config of smtpConfigs) {
          await this.emailService.sendEmail(email, config);
        }
      }
    }, { connection });
  }
}
