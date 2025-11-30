import { SmtpService } from './services/smtpService';
import { TemplateService } from './services/templateService';
import { TrackingService } from './services/trackingService';
import { EmailService } from './services/emailService';
import { AgentService } from './services/agentService';
import { CacheService } from './services/cacheService';
import { JobService } from './services/jobService';

class Container {
  public readonly smtpService: SmtpService;
  public readonly templateService: TemplateService;
  public readonly trackingService: TrackingService;
  public readonly emailService: EmailService;
  public readonly agentService: AgentService;
  public readonly cacheService: CacheService;
  public readonly jobService: JobService;

  constructor() {
    this.cacheService = new CacheService();
    this.smtpService = new SmtpService();
    this.templateService = new TemplateService(this.cacheService);
    this.trackingService = new TrackingService();
    this.emailService = new EmailService(this.smtpService, this.templateService, this.trackingService);
    this.agentService = new AgentService();
    this.jobService = new JobService(this.emailService);
    this.emailService.setJobService(this.jobService);
  }
}

export const container = new Container();
