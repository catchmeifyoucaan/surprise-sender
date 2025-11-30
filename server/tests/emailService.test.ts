import { EmailService } from '../src/services/emailService';
import { SmtpService } from '../src/services/smtpService';
import { TemplateService } from '../src/services/templateService';
import { TrackingService } from '../src/services/trackingService';
import { CacheService } from '../src/services/cacheService';
import { SmtpConfiguration } from '../src/entities';
import { EmailData } from '../src/types';
import nodemailer from 'nodemailer';
import { AppDataSource } from '../src/data-source';
import { validateSmtpConfig } from '../src/utils/smtp';

// Mock nodemailer
jest.mock('nodemailer');
const mockedNodemailer = nodemailer as jest.Mocked<typeof nodemailer>;

// Mock AppDataSource
jest.mock('../src/data-source', () => ({
  AppDataSource: {
    getRepository: jest.fn().mockReturnValue({
      create: jest.fn().mockImplementation((entity) => entity),
      save: jest.fn().mockImplementation((entity) => Promise.resolve({ ...entity, id: 'mock-tracking-id' })),
    }),
  },
}));

// Mock smtp utils
jest.mock('../src/utils/smtp', () => ({
  validateSmtpConfig: jest.fn().mockResolvedValue({ success: true }),
}));

// Mock CacheService
jest.mock('../src/services/cacheService');
const mockedCacheService = CacheService as jest.MockedClass<typeof CacheService>;

describe('EmailService', () => {
  let emailService: EmailService;
  let smtpService: SmtpService;
  let templateService: TemplateService;
  let trackingService: TrackingService;
  let cacheService: CacheService;

  beforeEach(() => {
    // Reset mocks before each test
    jest.clearAllMocks();

    cacheService = new mockedCacheService();
    smtpService = new SmtpService();
    templateService = new TemplateService(cacheService);
    trackingService = new TrackingService();
    emailService = new EmailService(smtpService, templateService, trackingService);

    // Mock the transporter
    const mockTransporter = {
      sendMail: jest.fn().mockResolvedValue({ messageId: 'mock-message-id' }),
      verify: jest.fn().mockResolvedValue(true),
    };
    mockedNodemailer.createTransport.mockReturnValue(mockTransporter as any);
  });

  it('should send an email successfully', async () => {
    const smtpConfig: SmtpConfiguration = {
      id: '1',
      userId: '1',
      name: 'Test SMTP',
      host: 'smtp.example.com',
      port: 587,
      secure: false,
      username: 'testuser',
      password: 'testpassword',
      fromEmail: 'test@example.com',
      fromName: 'Test User',
      isActive: true,
      lastChecked: new Date(),
      lastValidated: new Date(),
      lastUsed: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
      maxEmailsPerDay: 1000,
      currentEmailsSent: 0,
      status: 'active',
      providerType: 'smtp',
      reputationScore: 100,
      healthCheckLastRun: new Date(),
      isValid: true,
      user: {} as any,
      validateFields: () => {},
    };

    const emailData: EmailData = {
      to: 'recipient@example.com',
      subject: 'Test Email',
      body: 'This is a test email.',
      isHtml: false,
    };

    const result = await emailService.sendEmail(emailData, smtpConfig);

    expect(result.success).toBe(true);
    expect(result.messageId).toBe('mock-message-id');
    expect(result.trackingId).toBe('mock-tracking-id');
    expect(AppDataSource.getRepository).toHaveBeenCalledWith(SmtpConfiguration);
  });

  it('should handle email sending failure', async () => {
    const smtpConfig: SmtpConfiguration = {
      id: '1',
      userId: '1',
      name: 'Test SMTP',
      host: 'smtp.example.com',
      port: 587,
      secure: false,
      username: 'testuser',
      password: 'testpassword',
      fromEmail: 'test@example.com',
      fromName: 'Test User',
      isActive: true,
      lastChecked: new Date(),
      lastValidated: new Date(),
      lastUsed: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
      maxEmailsPerDay: 1000,
      currentEmailsSent: 0,
      status: 'active',
      providerType: 'smtp',
      reputationScore: 100,
      healthCheckLastRun: new Date(),
      isValid: true,
      user: {} as any,
      validateFields: () => {},
    };

    const emailData: EmailData = {
      to: 'recipient@example.com',
      subject: 'Test Email',
      body: 'This is a test email.',
      isHtml: false,
    };

    // Mock the transporter to reject
    const mockTransporter = {
      sendMail: jest.fn().mockRejectedValue(new Error('SMTP Error')),
      verify: jest.fn().mockResolvedValue(true),
    };
    mockedNodemailer.createTransport.mockReturnValue(mockTransporter as any);

    const result = await emailService.sendEmail(emailData, smtpConfig);

    expect(result.success).toBe(false);
    expect(result.error).toBe('SMTP Error');
  });
});
