import nodemailer, { Transporter, SentMessageInfo, TransportOptions } from 'nodemailer';
import { SmtpConfiguration, EmailTracking } from '../entities';
import { AppDataSource } from '../data-source';
import { EmailData } from '../types';
import { createApiResponse } from '../middleware/validation';
import { validateSmtpConfig } from '../utils/smtp';
import crypto from 'crypto';
import dns from 'dns';
import { promisify } from 'util';

const dnsResolve = promisify(dns.resolve);
const dnsResolveMx = promisify(dns.resolveMx);

interface AdvancedEmailResult {
  success: boolean;
  messageId?: string;
  error?: string;
  usedConfig?: SmtpConfiguration;
  trackingId?: string;
  deliveryScore?: number;
  obfuscationLevel?: number;
  analysis?: {
    spamScore: number;
    deliverabilityScore: number;
    reputationScore: number;
    blacklistStatus: string[];
    dkimStatus: 'valid' | 'invalid' | 'unknown';
    spfStatus: 'valid' | 'invalid' | 'unknown';
    dmarcStatus: 'valid' | 'invalid' | 'unknown';
  };
}

interface BulkValidationResult {
  total: number;
  valid: number;
  invalid: number;
  results: {
    id: string;
    host: string;
    username: string;
    status: 'valid' | 'invalid' | 'testing';
    error?: string;
    deliveryScore?: number;
    speedScore?: number;
    reputationScore?: number;
    lastTested: Date;
    testDuration: number;
  }[];
}

interface EmailDeliveryOptimization {
  subjectObfuscation: boolean;
  contentObfuscation: boolean;
  headerObfuscation: boolean;
  attachmentObfuscation: boolean;
  timingOptimization: boolean;
  routingOptimization: boolean;
}

class AdvancedEmailService {
  private transporterPool: Map<string, Transporter> = new Map();
  private validationCache: Map<string, { result: any; timestamp: number }> = new Map();
  private deliveryOptimization: EmailDeliveryOptimization = {
    subjectObfuscation: true,
    contentObfuscation: true,
    headerObfuscation: true,
    attachmentObfuscation: true,
    timingOptimization: true,
    routingOptimization: true
  };

  // Ultra-fast SMTP validation with parallel processing
  async validateSmtpConfigurations(configs: SmtpConfiguration[]): Promise<BulkValidationResult> {
    const results: BulkValidationResult['results'] = [];
    const validationPromises = configs.map(async (config) => {
      const startTime = Date.now();
      
      try {
        // Parallel validation checks
        const [connectionTest, dnsTest, reputationTest] = await Promise.all([
          this.testConnection(config),
          this.validateDNS(config),
          this.checkReputation(config)
        ]);

        const testDuration = Date.now() - startTime;
        const deliveryScore = this.calculateDeliveryScore(connectionTest, dnsTest, reputationTest);
        const speedScore = this.calculateSpeedScore(testDuration);
        const reputationScore = reputationTest.score;

        const result = {
          id: config.id,
          host: config.host,
          username: config.username,
          status: deliveryScore > 80 ? 'valid' : 'invalid',
          deliveryScore,
          speedScore,
          reputationScore,
          lastTested: new Date(),
          testDuration
        };

        // Cache the result
        this.validationCache.set(config.id, {
          result,
          timestamp: Date.now()
        });

        return result;
      } catch (error) {
        const testDuration = Date.now() - startTime;
        return {
          id: config.id,
          host: config.host,
          username: config.username,
          status: 'invalid' as const,
          error: error instanceof Error ? error.message : 'Validation failed',
          deliveryScore: 0,
          speedScore: 0,
          reputationScore: 0,
          lastTested: new Date(),
          testDuration
        };
      }
    });

    const validationResults = await Promise.all(validationPromises);
    
    return {
      total: configs.length,
      valid: validationResults.filter(r => r.status === 'valid').length,
      invalid: validationResults.filter(r => r.status === 'invalid').length,
      results: validationResults
    };
  }

  // Test SMTP connection with advanced checks
  private async testConnection(config: SmtpConfiguration): Promise<any> {
    const transporter = nodemailer.createTransport({
      host: config.host,
      port: config.port,
      secure: config.secure,
      auth: {
        user: config.username,
        pass: config.password
      },
      pool: true,
      maxConnections: 10,
      maxMessages: 100,
      rateLimit: 20,
      rateDelta: 1000,
      connectionTimeout: 10000,
      greetingTimeout: 10000,
      socketTimeout: 10000
    } as TransportOptions);

    try {
      await transporter.verify();
      const capabilities = await transporter.getCapabilities();
      
      return {
        success: true,
        capabilities,
        maxMessageSize: capabilities['SIZE'] || 10485760,
        supportsTLS: capabilities['STARTTLS'] || false,
        supportsPipelining: capabilities['PIPELINING'] || false
      };
    } catch (error) {
      throw new Error(`Connection failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Validate DNS records
  private async validateDNS(config: SmtpConfiguration): Promise<any> {
    try {
      const domain = config.host.split('.').slice(-2).join('.');
      const [mxRecords, spfRecords, dkimRecords] = await Promise.all([
        dnsResolveMx(domain).catch(() => []),
        dnsResolve(domain, 'TXT').catch(() => []),
        dnsResolve(`${config.host}.${domain}`, 'TXT').catch(() => [])
      ]);

      return {
        mxRecords: mxRecords.length > 0,
        spfRecords: spfRecords.some(record => record.includes('v=spf1')),
        dkimRecords: dkimRecords.length > 0,
        domain: domain
      };
    } catch (error) {
      return {
        mxRecords: false,
        spfRecords: false,
        dkimRecords: false,
        error: error instanceof Error ? error.message : 'DNS validation failed'
      };
    }
  }

  // Check reputation and blacklist status
  private async checkReputation(config: SmtpConfiguration): Promise<any> {
    // Simulate reputation checking (in real implementation, integrate with reputation services)
    const domain = config.host.split('.').slice(-2).join('.');
    
    // Check against common blacklists
    const blacklists = [
      'zen.spamhaus.org',
      'bl.spamcop.net',
      'dnsbl.sorbs.net'
    ];

    const blacklistChecks = await Promise.all(
      blacklists.map(async (blacklist) => {
        try {
          const result = await dnsResolve(`${domain}.${blacklist}`);
          return { blacklist, listed: result.length > 0 };
        } catch {
          return { blacklist, listed: false };
        }
      })
    );

    const listedCount = blacklistChecks.filter(check => check.listed).length;
    const score = Math.max(0, 100 - (listedCount * 25));

    return {
      score,
      blacklisted: listedCount > 0,
      blacklists: blacklistChecks.filter(check => check.listed).map(check => check.blacklist)
    };
  }

  // Calculate delivery score
  private calculateDeliveryScore(connection: any, dns: any, reputation: any): number {
    let score = 0;
    
    // Connection score (40%)
    if (connection.success) score += 40;
    
    // DNS score (30%)
    if (dns.mxRecords) score += 15;
    if (dns.spfRecords) score += 10;
    if (dns.dkimRecords) score += 5;
    
    // Reputation score (30%)
    score += reputation.score * 0.3;
    
    return Math.round(score);
  }

  // Calculate speed score
  private calculateSpeedScore(duration: number): number {
    if (duration < 1000) return 100;
    if (duration < 3000) return 80;
    if (duration < 5000) return 60;
    if (duration < 10000) return 40;
    return 20;
  }

  // Advanced email sending with obfuscation and optimization
  async sendAdvancedEmail(
    emailData: EmailData,
    smtpConfigs: SmtpConfiguration[],
    options: {
      obfuscationLevel?: 'low' | 'medium' | 'high';
      deliveryOptimization?: boolean;
      tracking?: boolean;
      analysis?: boolean;
    } = {}
  ): Promise<AdvancedEmailResult> {
    const {
      obfuscationLevel = 'medium',
      deliveryOptimization = true,
      tracking = true,
      analysis = true
    } = options;

    // Optimize email content
    const optimizedEmail = deliveryOptimization ? 
      this.optimizeEmailContent(emailData, obfuscationLevel) : 
      emailData;

    // Try each SMTP configuration with intelligent routing
    const sortedConfigs = this.sortConfigsByPerformance(smtpConfigs);
    
    for (const config of sortedConfigs) {
      try {
        const result = await this.sendWithConfig(optimizedEmail, config, {
          tracking,
          analysis
        });

        if (result.success) {
          // Update configuration performance metrics
          await this.updateConfigMetrics(config, true);
          return result;
        }
      } catch (error) {
        await this.updateConfigMetrics(config, false);
        continue;
      }
    }

    throw new Error('All SMTP configurations failed');
  }

  // Optimize email content for better delivery
  private optimizeEmailContent(emailData: EmailData, obfuscationLevel: string): EmailData {
    let optimized = { ...emailData };

    if (obfuscationLevel === 'high') {
      // High-level obfuscation
      optimized.subject = this.obfuscateText(emailData.subject);
      optimized.body = this.obfuscateText(emailData.body);
    } else if (obfuscationLevel === 'medium') {
      // Medium-level obfuscation
      optimized.subject = this.obfuscateSubject(emailData.subject);
      optimized.body = this.obfuscateContent(emailData.body);
    }

    // Add delivery optimization headers
    optimized.headers = {
      'X-Mailer': 'Advanced Email Service',
      'X-Priority': '3',
      'X-MSMail-Priority': 'Normal',
      'X-Report-Abuse': 'Please report abuse here',
      'List-Unsubscribe': '<mailto:unsubscribe@domain.com>',
      'Precedence': 'bulk'
    };

    return optimized;
  }

  // Obfuscate text content
  private obfuscateText(text: string): string {
    return text
      .replace(/[a-zA-Z]/g, (char) => {
        const code = char.charCodeAt(0);
        return String.fromCharCode(code + 1);
      })
      .replace(/[0-9]/g, (num) => {
        return String((parseInt(num) + 1) % 10);
      });
  }

  // Obfuscate subject line
  private obfuscateSubject(subject: string): string {
    const words = subject.split(' ');
    const obfuscatedWords = words.map(word => {
      if (word.length > 3) {
        return word.charAt(0) + '*'.repeat(word.length - 2) + word.charAt(word.length - 1);
      }
      return word;
    });
    return obfuscatedWords.join(' ');
  }

  // Obfuscate email content
  private obfuscateContent(content: string): string {
    // Replace sensitive patterns
    return content
      .replace(/\b\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}\b/g, '****-****-****-****')
      .replace(/\b\d{3}[\s-]?\d{2}[\s-]?\d{4}\b/g, '***-**-****')
      .replace(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g, '***@***.***');
  }

  // Sort configurations by performance
  private sortConfigsByPerformance(configs: SmtpConfiguration[]): SmtpConfiguration[] {
    return configs.sort((a, b) => {
      const scoreA = this.getConfigScore(a);
      const scoreB = this.getConfigScore(b);
      return scoreB - scoreA;
    });
  }

  // Get configuration performance score
  private getConfigScore(config: SmtpConfiguration): number {
    let score = 0;
    
    // Base score from validation
    if (config.isValid) score += 50;
    
    // Success rate
    const successRate = config.stats?.total ? 
      (config.stats.total - (config.stats.total - config.stats.daily)) / config.stats.total : 0;
    score += successRate * 30;
    
    // Recent activity
    if (config.lastUsed) {
      const daysSinceLastUse = (Date.now() - new Date(config.lastUsed).getTime()) / (1000 * 60 * 60 * 24);
      if (daysSinceLastUse < 1) score += 20;
      else if (daysSinceLastUse < 7) score += 10;
    }
    
    return score;
  }

  // Send email with specific configuration
  private async sendWithConfig(
    emailData: EmailData,
    config: SmtpConfiguration,
    options: { tracking: boolean; analysis: boolean }
  ): Promise<AdvancedEmailResult> {
    const transporter = await this.getTransporter(config);
    
    const mailOptions = {
      from: config.fromEmail || config.username,
      to: emailData.to,
      subject: emailData.subject,
      text: emailData.isHtml ? undefined : emailData.body,
      html: emailData.isHtml ? emailData.body : undefined,
      cc: emailData.cc,
      bcc: emailData.bcc,
      replyTo: emailData.replyTo,
      headers: emailData.headers,
      attachments: emailData.attachments?.map(attachment => ({
        filename: attachment.name,
        content: attachment,
        contentType: attachment.type
      }))
    };

    const info: SentMessageInfo = await transporter.sendMail(mailOptions);
    
    const result: AdvancedEmailResult = {
      success: true,
      messageId: info.messageId,
      usedConfig: config,
      deliveryScore: this.getConfigScore(config),
      obfuscationLevel: 1
    };

    if (options.analysis) {
      result.analysis = await this.analyzeEmail(emailData, config);
    }

    if (options.tracking) {
      result.trackingId = await this.saveAdvancedTracking(emailData, config, info, 'delivered');
    }

    return result;
  }

  // Analyze email for delivery optimization
  private async analyzeEmail(emailData: EmailData, config: SmtpConfiguration): Promise<any> {
    const analysis = {
      spamScore: this.calculateSpamScore(emailData),
      deliverabilityScore: this.calculateDeliverabilityScore(emailData, config),
      reputationScore: this.getConfigScore(config),
      blacklistStatus: [],
      dkimStatus: 'unknown' as const,
      spfStatus: 'unknown' as const,
      dmarcStatus: 'unknown' as const
    };

    // Check domain reputation
    const domain = config.host.split('.').slice(-2).join('.');
    try {
      const blacklistChecks = await Promise.all([
        dnsResolve(`${domain}.zen.spamhaus.org`).catch(() => []),
        dnsResolve(`${domain}.bl.spamcop.net`).catch(() => [])
      ]);

      analysis.blacklistStatus = blacklistChecks
        .map((result, index) => result.length > 0 ? ['zen.spamhaus.org', 'bl.spamcop.net'][index] : null)
        .filter(Boolean);
    } catch (error) {
      // Ignore DNS errors
    }

    return analysis;
  }

  // Calculate spam score
  private calculateSpamScore(emailData: EmailData): number {
    let score = 0;
    
    // Subject analysis
    const subject = emailData.subject.toLowerCase();
    if (subject.includes('free')) score += 5;
    if (subject.includes('urgent')) score += 3;
    if (subject.includes('limited time')) score += 4;
    if (subject.includes('act now')) score += 3;
    
    // Content analysis
    const body = emailData.body.toLowerCase();
    if (body.includes('click here')) score += 2;
    if (body.includes('buy now')) score += 3;
    if (body.includes('limited offer')) score += 4;
    
    // Length analysis
    if (emailData.body.length < 50) score += 5;
    if (emailData.body.length > 10000) score += 3;
    
    return Math.min(100, score);
  }

  // Calculate deliverability score
  private calculateDeliverabilityScore(emailData: EmailData, config: SmtpConfiguration): number {
    let score = 100;
    
    // Configuration quality
    if (!config.isValid) score -= 30;
    if (!config.isActive) score -= 20;
    
    // Email quality
    if (!emailData.subject) score -= 10;
    if (!emailData.body) score -= 10;
    if (emailData.body.length < 10) score -= 15;
    
    // Domain reputation
    const domain = config.host.split('.').slice(-2).join('.');
    if (domain.includes('temp') || domain.includes('test')) score -= 20;
    
    return Math.max(0, score);
  }

  // Get or create SMTP transporter
  private async getTransporter(config: SmtpConfiguration): Promise<Transporter> {
    const key = `${config.host}:${config.port}:${config.username}`;
    
    if (this.transporterPool.has(key)) {
      return this.transporterPool.get(key)!;
    }

    const transporter = nodemailer.createTransporter({
      host: config.host,
      port: config.port,
      secure: config.secure,
      auth: {
        user: config.username,
        pass: config.password
      },
      pool: true,
      maxConnections: 20,
      maxMessages: 200,
      rateLimit: 50,
      rateDelta: 1000,
      connectionTimeout: 15000,
      greetingTimeout: 15000,
      socketTimeout: 15000
    } as TransportOptions);

    await transporter.verify();
    this.transporterPool.set(key, transporter);
    return transporter;
  }

  // Save advanced tracking information
  private async saveAdvancedTracking(
    emailData: EmailData,
    config: SmtpConfiguration,
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
      smtpConfigId: config.id,
      sentAt: new Date(),
      messageId: info?.messageId,
      metadata: {
        deliveryScore: this.getConfigScore(config),
        obfuscationLevel: 1,
        analysis: await this.analyzeEmail(emailData, config)
      }
    });

    const savedTracking = await trackingRepo.save(tracking);
    return savedTracking.id;
  }

  // Update configuration metrics
  private async updateConfigMetrics(config: SmtpConfiguration, success: boolean): Promise<void> {
    const smtpRepo = AppDataSource.getRepository(SmtpConfiguration);
    
    if (success) {
      config.currentEmailsSent = (config.currentEmailsSent || 0) + 1;
      config.lastUsed = new Date();
      
      // Update stats
      if (!config.stats) config.stats = { daily: 0, monthly: 0, total: 0 };
      config.stats.daily = (config.stats.daily || 0) + 1;
      config.stats.monthly = (config.stats.monthly || 0) + 1;
      config.stats.total = (config.stats.total || 0) + 1;
    }
    
    await smtpRepo.save(config);
  }

  // Get validation cache
  getValidationCache(): Map<string, any> {
    return this.validationCache;
  }

  // Clear validation cache
  clearValidationCache(): void {
    this.validationCache.clear();
  }

  // Get cached validation result
  getCachedValidation(configId: string): any {
    const cached = this.validationCache.get(configId);
    if (cached && Date.now() - cached.timestamp < 300000) { // 5 minutes cache
      return cached.result;
    }
    return null;
  }
}

export const advancedEmailService = new AdvancedEmailService();