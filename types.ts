export interface User {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'user';
  status: 'active' | 'pending' | 'suspended';
  company?: string;
  registeredAt: string;
  lastLogin?: string;
  twoFactorEnabled: boolean;
  twoFactorSecret?: string;
  twoFactorRecoveryCodes: string[];
  preferences: {
    theme: string;
    notifications: {
      email: boolean;
      telegram: boolean;
      desktop: boolean;
    };
    language: string;
    timezone: string;
  };
  permissions: {
    canSendEmails: boolean;
    canManageUsers: boolean;
    canManageTemplates: boolean;
    canManageCampaigns: boolean;
    canManageAgents: boolean;
  };
  securitySettings: {
    sessionTimeout: number;
    passwordExpiry: number;
    maxLoginAttempts: number;
    requireTwoFactor: boolean;
    passwordHistory: string[];
    lastPasswordChange: Date;
  };
  loginHistory: {
    timestamp: Date;
    ip: string;
    userAgent: string;
    success: boolean;
  }[];
}

export interface UserActivity {
  id: string;
  timestamp: string;
  description: string;
  userId: string;
  metadata?: any;
}

export interface SmtpConfiguration {
  id: string;
  userId: string;
  name: string;
  host: string;
  port: number;
  username: string;
  password: string;
  secure: boolean;
  isActive: boolean;
  lastChecked?: string;
  lastValidated?: string;
  lastUsed?: string;
  createdAt: string;
  updatedAt: string;
  maxEmailsPerDay: number;
  currentEmailsSent: number;
  status: 'active' | 'inactive' | 'error';
  providerType: 'smtp' | 'webmail' | 'api';
  webmailProvider?: string;
  apiProvider?: string;
  apiKey?: string;
  region?: string;
  fromEmail?: string;
  fromName?: string;
  isValid: boolean;
  lastError?: string;
  security?: {
    ssl: boolean;
    tls: boolean;
    starttls: boolean;
  };
  stats?: {
    daily: number;
    monthly: number;
    total: number;
  };
  limits?: {
    daily: number;
    monthly: number;
    concurrent: number;
    maxFileSize: number;
    allowedFileTypes: string[];
  };
}

export interface EmailData {
  to: string;
  subject: string;
  body: string;
  isHtml: boolean;
  attachments?: File[];
  cc?: string[];
  bcc?: string[];
  replyTo?: string;
  templateId?: string;
  metadata?: any;
}

export interface TelegramConfig {
  botToken: string;
  chatId: string;
  enabled: boolean;
  notifications: {
    email: boolean;
    campaign: boolean;
    system: boolean;
  };
}

export interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  userActivities: UserActivity[];
  smtpConfigurations: SmtpConfiguration[];
  emailDrafts: EmailData[];
  telegramConfig: TelegramConfig | null;
  login: (email: string, password: string) => Promise<User>;
  logout: () => void;
  registerUser: (userData: Omit<User, 'id' | 'role' | 'registeredAt'>) => Promise<User>;
  logUserActivity: (description: string) => Promise<void>;
  setSmtpConfigurations: (configs: SmtpConfiguration[]) => void;
  setEmailDrafts: (drafts: EmailData[]) => void;
  setTelegramConfig: (config: TelegramConfig | null) => void;
} 