import { AppDataSource } from '../data-source';
import { UserActivity } from '../entities';
import { User } from '../entities';

class AuditLogService {
    async logAction(user: User, action: string, details?: string, ipAddress?: string, userAgent?: string): Promise<void> {
        const activityRepo = AppDataSource.getRepository(UserActivity);
        const activity = new UserActivity();
        activity.user = user;
        activity.description = `${user.name} ${action}`;
        activity.metadata = {
            action,
            details,
            ipAddress,
            userAgent,
        };
        await activityRepo.save(activity);
    }
}

export const auditLogService = new AuditLogService();
