import { CacheService } from './cacheService';
import { AppDataSource } from '../data-source';
import { EmailTemplate as EmailTemplateEntity } from '../entities';

export interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  body: string;
  isHtml: boolean;
  variables: string[];
}

export class TemplateService {
  constructor(private cacheService: CacheService) {}

  public async getTemplates(): Promise<EmailTemplate[]> {
    const cachedTemplates = await this.cacheService.get<EmailTemplate[]>('templates');
    if (cachedTemplates) {
      return cachedTemplates;
    }

    const templateRepo = AppDataSource.getRepository(EmailTemplateEntity);
    const templates = await templateRepo.find();
    await this.cacheService.set('templates', templates, 3600); // Cache for 1 hour
    return templates;
  }

  public async getTemplate(templateId: string): Promise<EmailTemplate | null> {
    const cachedTemplate = await this.cacheService.get<EmailTemplate>(`template:${templateId}`);
    if (cachedTemplate) {
      return cachedTemplate;
    }

    const templateRepo = AppDataSource.getRepository(EmailTemplateEntity);
    const template = await templateRepo.findOne({ where: { id: templateId } });
    if (template) {
      await this.cacheService.set(`template:${templateId}`, template, 3600); // Cache for 1 hour
    }
    return template;
  }

  public async addTemplate(templateData: Omit<EmailTemplate, 'id'>): Promise<EmailTemplate> {
    const templateRepo = AppDataSource.getRepository(EmailTemplateEntity);
    const template = templateRepo.create(templateData);
    const savedTemplate = await templateRepo.save(template);
    await this.cacheService.del('templates'); // Invalidate the list cache
    return savedTemplate;
  }

  public async removeTemplate(templateId: string): Promise<boolean> {
    const templateRepo = AppDataSource.getRepository(EmailTemplateEntity);
    const result = await templateRepo.delete(templateId);
    if (result.affected) {
      await this.cacheService.del('templates'); // Invalidate the list cache
      await this.cacheService.del(`template:${templateId}`); // Invalidate the item cache
      return true;
    }
    return false;
  }
}
