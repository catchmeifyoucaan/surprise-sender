import { AppDataSource } from '../data-source';
import { EmailJob } from '../entities/EmailJob';
import { SmtpConfiguration } from '../entities';
import { emailService } from './emailService';
import { reputationService } from './reputationService';
import { LessThanOrEqual, MoreThan } from 'typeorm';

class WorkerService {
    private isRunning = false;

    async processQueue(): Promise<void> {
        if (this.isRunning) {
            return;
        }

        this.isRunning = true;

        const emailJobRepo = AppDataSource.getRepository(EmailJob);
        const smtpConfigRepo = AppDataSource.getRepository(SmtpConfiguration);

        // Find a healthy SMTP configuration
        const smtpConfig = await smtpConfigRepo.createQueryBuilder('smtp')
            .where('smtp.isActive = :isActive', { isActive: true })
            .andWhere('smtp.status = :status', { status: 'active' })
            .andWhere('smtp.reputationScore > :score', { score: 20 })
            .andWhere('smtp.currentEmailsSent < smtp.limits.daily')
            .orderBy('smtp.reputationScore', 'DESC')
            .addOrderBy('smtp.lastUsed', 'ASC')
            .getOne();

        if (!smtpConfig) {
            this.isRunning = false;
            return;
        }

        const job = await emailJobRepo.findOne({
            where: {
                status: 'pending'
            },
            order: {
                createdAt: 'ASC'
            }
        });

        if (!job) {
            this.isRunning = false;
            return;
        }

        job.status = 'processing';
        job.attempts++;
        job.lastAttemptAt = new Date();
        await emailJobRepo.save(job);

        try {
            let emailToSend = { ...job.emailData };

            if (job.useContextualEngine && job.crewId && emailToSend.recipientMetadata) {
                const { agentService } = await import('./agentService');
                emailToSend = await agentService.generateContextualEmail(
                    job.crewId,
                    emailToSend,
                    emailToSend.recipientMetadata
                );
            }

            const { randomizeEmailMetadata } = await import('../utils/randomization');
            const randomizedBody = randomizeEmailMetadata(emailToSend.body, emailToSend.isHtml);
            emailToSend.body = randomizedBody;

            const result = await emailService.sendEmail(emailToSend, smtpConfig);
            await reputationService.updateReputation(smtpConfig.id, result.success, result.error);
            if (result.success) {
                job.status = 'sent';
            } else {
                job.status = 'failed';
                job.lastError = result.error;
                await reputationService.runHealthCheck(smtpConfig.id);
            }
        } catch (error) {
            job.status = 'failed';
            job.lastError = error instanceof Error ? error.message : 'Unknown error';
            await reputationService.updateReputation(smtpConfig.id, false, job.lastError);
            await reputationService.runHealthCheck(smtpConfig.id);
        }

        await emailJobRepo.save(job);

        this.isRunning = false;
    }

    start(): void {
        setInterval(() => {
            this.processQueue();
        }, 5000); // Check for new jobs every 5 seconds
    }
}

export const workerService = new WorkerService();
