import { EmailData, SmtpConfiguration, SmtpConfig } from '../types';

export class EmailService {
  public static parseSmtpConfig(config: string): SmtpConfig | null {
    try {
      // Handle SMTP URL format (smtp://user:pass@host:port)
      if (config.startsWith('smtp://') || config.startsWith('smtps://')) {
        const url = new URL(config);
        return {
          host: url.hostname,
          port: parseInt(url.port || '587'),
          user: url.username,
          pass: url.password,
          secure: url.protocol === 'smtps:'
        };
      }

      // Handle webmail format (email:password)
      if (config.includes('@') && config.split(':').length === 2) {
        const [email, password] = config.split(':');
        const domain = email.split('@')[1].toLowerCase();
        const smtpServers: { [key: string]: string } = {
          'hotmail.com': 'smtp-mail.outlook.com',
          'outlook.com': 'smtp-mail.outlook.com',
          'outlook.kr': 'smtp-mail.outlook.com',
          'gmail.com': 'smtp.gmail.com',
          'yahoo.com': 'smtp.mail.yahoo.com',
          'aol.com': 'smtp.aol.com',
          'protonmail.com': 'smtp.protonmail.com',
          'zoho.com': 'smtp.zoho.com',
          'yandex.com': 'smtp.yandex.com',
          'mail.com': 'smtp.mail.com'
        };
        const smtpServer = smtpServers[domain] || `smtp.${domain}`;
        return {
          host: smtpServer,
          port: 587,
          user: email,
          pass: password,
          secure: false
        };
      }

      // Accept both | and : as delimiters for host, port, user, pass, secure
      let delimiter = '|';
      if (config.includes(':') && config.split(':').length >= 4) delimiter = ':';
      const parts = config.split(delimiter).map(p => p.trim());

      // host:port:user:pass:secure (secure is optional)
      if (parts.length >= 4) {
        const [host, port, user, pass, secureRaw] = parts;
        let secure = false;
        if (typeof secureRaw !== 'undefined') {
          secure = secureRaw === 'true' || secureRaw === '1';
        } else {
          // Default secure to true if port is 465
          secure = port === '465';
        }
        return {
          host,
          port: parseInt(port || '587'),
          user,
          pass,
          secure
        };
      }

      // host:user:pass (default port 587)
      if (parts.length === 3) {
        const [host, user, pass] = parts;
        return {
          host,
          port: 587,
          user,
          pass,
          secure: false
        };
      }

      // Fallback: not recognized
      return null;
    } catch (error) {
      console.error('Error parsing SMTP config:', error);
      return null;
    }
  }

  static async validateSmtpConfig(smtpConfigs: SmtpConfiguration[]): Promise<{
    success: boolean;
    validConfigs: SmtpConfiguration[];
    invalidConfigs: { config: SmtpConfiguration; error: string }[];
    total: number;
    valid: number;
    invalid: number;
    error?: string;
  }> {
    try {
      console.log('Validating SMTP configurations:', smtpConfigs.length);
      
      // Ensure we have an array of configurations
      const configsToValidate = Array.isArray(smtpConfigs) ? smtpConfigs : [smtpConfigs];
      
      // Validate each configuration format
      for (const config of configsToValidate) {
        if (!config.host || !config.port || !config.user || !config.pass) {
          throw new Error('Invalid SMTP configuration format');
        }
      }

      const response = await fetch('/api/validate-smtp', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ configs: configsToValidate }),
      });

      console.log('Response status:', response.status);
      console.log('Response headers:', Object.fromEntries(response.headers.entries()));
      
      const responseText = await response.text();
      console.log('Raw response:', responseText);
      
      let data;
      try {
        data = JSON.parse(responseText);
      } catch (e) {
        console.error('Failed to parse response:', e);
        throw new Error('Invalid response from server');
      }

      if (!response.ok) {
        throw new Error(data.error || 'Failed to validate SMTP configurations');
      }

      if (!data.success) {
        throw new Error(data.error || 'Validation failed');
      }

      return {
        success: true,
        validConfigs: data.validConfigs || [],
        invalidConfigs: data.invalidConfigs || [],
        total: data.total || 0,
        valid: data.valid || 0,
        invalid: data.invalid || 0
      };
    } catch (error: any) {
      console.error('SMTP validation error:', error);
      return {
        success: false,
        validConfigs: [],
        invalidConfigs: [],
        total: 0,
        valid: 0,
        invalid: 0,
        error: error.message || 'Failed to validate SMTP configurations'
      };
    }
  }

  static async sendEmail(emailData: EmailData, smtpConfigs: SmtpConfiguration[]): Promise<{
    success: boolean;
    error?: string;
    usedSmtp?: SmtpConfiguration;
  }> {
    try {
      console.log('Sending email with', smtpConfigs.length, 'SMTP configurations');
      
      const response = await fetch('/api/send-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ emailData, smtpConfigs }),
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to send email');
      }

      return {
        success: true,
        usedSmtp: data.usedSmtp
      };
    } catch (error: any) {
      console.error('Failed to send email:', error);
      return {
        success: false,
        error: error.message || 'Failed to send email'
      };
    }
  }

  static async getSmtpConfigurations(): Promise<SmtpConfiguration[]> {
    try {
      const response = await fetch('/api/smtp-configurations');
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to get SMTP configurations');
      }

      console.log('Retrieved SMTP configurations:', data.configurations.length);
      return data.configurations;
    } catch (error: any) {
      console.error('Failed to get SMTP configurations:', error);
      return [];
    }
  }

  static async getSmtpStats(): Promise<{
    active: number;
    total: number;
    successRate: number;
  }> {
    try {
      const response = await fetch('/api/smtp-stats');
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to get SMTP statistics');
      }

      return {
        active: data.active || 0,
        total: data.total || 0,
        successRate: data.successRate || 0
      };
    } catch (error: any) {
      console.error('Failed to get SMTP statistics:', error);
      return {
        active: 0,
        total: 0,
        successRate: 0
      };
    }
  }

  static async getEmailStats(since: Date): Promise<{
    total: number;
    sentToday: number;
    failedToday: number;
  }> {
    try {
      const response = await fetch(`/api/email-stats?since=${since.toISOString()}`);
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to get email stats');
      }

      return {
        total: data.total,
        sentToday: data.sentToday,
        failedToday: data.failedToday
      };
    } catch (error: any) {
      console.error('Failed to get email stats:', error);
      return {
        total: 0,
        sentToday: 0,
        failedToday: 0
      };
    }
  }

  static async getRecentActivity(): Promise<Array<{
    timestamp: string;
    action: string;
    details: string;
    status: string;
  }>> {
    try {
      const response = await fetch('/api/recent-activity');
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to get recent activity');
      }

      return data.activities;
    } catch (error: any) {
      console.error('Failed to get recent activity:', error);
      return [];
    }
  }

  async getTrackingStats(): Promise<{
    totalSent: number;
    totalOpened: number;
    totalClicked: number;
    openRate: number;
    clickRate: number;
    bounceRate: number;
  }> {
    try {
      const response = await fetch('/api/email-stats');
      if (!response.ok) {
        throw new Error('Failed to fetch tracking stats');
      }
      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error fetching tracking stats:', error);
      throw error;
    }
  }

  async getDetailedTracking(): Promise<Array<{
    timestamp: string;
    email: string;
    subject: string;
    status: string;
    details: string;
  }>> {
    try {
      const response = await fetch('/api/recent-activity');
      if (!response.ok) {
        throw new Error('Failed to fetch detailed tracking');
      }
      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error fetching detailed tracking:', error);
      throw error;
    }
  }
} 