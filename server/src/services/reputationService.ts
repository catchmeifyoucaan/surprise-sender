import { AppDataSource } from '../data-source';
import { SmtpConfiguration } from '../entities';
import { validateSmtpConfig } from '../utils/smtp';

class ReputationService {
    async updateReputation(smtpConfigId: string, success: boolean, error?: string): Promise<void> {
        const smtpRepo = AppDataSource.getRepository(SmtpConfiguration);
        const smtpConfig = await smtpRepo.findOne({ where: { id: smtpConfigId } });

        if (!smtpConfig) {
            return;
        }

        if (success) {
            smtpConfig.reputationScore = Math.min(100, smtpConfig.reputationScore + 1);
        } else {
            // Rudimentary error analysis
            if (error && error.includes('550')) {
                // Hard bounce or block
                smtpConfig.reputationScore = Math.max(0, smtpConfig.reputationScore - 20);
            } else {
                // Other failure
                smtpConfig.reputationScore = Math.max(0, smtpConfig.reputationScore - 5);
            }
        }

        await smtpRepo.save(smtpConfig);
    }

    async runHealthCheck(smtpConfigId: string): Promise<void> {
        const smtpRepo = AppDataSource.getRepository(SmtpConfiguration);
        const smtpConfig = await smtpRepo.findOne({ where: { id: smtpConfigId } });

        if (!smtpConfig) {
            return;
        }

        smtpConfig.healthCheckLastRun = new Date();
        const validation = await validateSmtpConfig(smtpConfig);

        if (validation.success) {
            smtpConfig.status = 'active';
            smtpConfig.lastError = undefined;
            smtpConfig.reputationScore = Math.min(100, smtpConfig.reputationScore + 5);
        } else {
            smtpConfig.status = 'error';
            smtpConfig.lastError = validation.error;
            smtpConfig.reputationScore = Math.max(0, smtpConfig.reputationScore - 10);
        }

        await smtpRepo.save(smtpConfig);
    }

    startPeriodicHealthChecks(): void {
        setInterval(async () => {
            const smtpRepo = AppDataSource.getRepository(SmtpConfiguration);
            const activeConfigs = await smtpRepo.find({ where: { isActive: true } });
            for (const config of activeConfigs) {
                await this.runHealthCheck(config.id);
            }
        }, 5 * 60 * 1000); // Run every 5 minutes
    }
}

export const reputationService = new ReputationService();
