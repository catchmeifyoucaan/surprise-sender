import React from 'react';

export interface IconProps {
  className?: string;
}

export interface NavItem {
  name:string;
  path: string;
  icon: React.ReactElement<IconProps>; 
}

export interface EmailData {
  id: string;
  to: string;
  subject: string;
  body: string;
  isHtml?: boolean;
  timestamp: string;
  metadata?: {
    type?: string;
    template?: string;
    agent?: string;
    generatedAt?: string;
  };
  // For CEO/CFO agent and others, specific dynamic fields might be used here
  [key: string]: any; 
}

export interface SelectOption {
  value: string | number;
  label: string;
}

export interface FileInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  wrapperClassName?: string;
  buttonText?: string;
  onFileSelect: (file: File | null | string) => void; // Allow string for AI generated placeholder
  currentValue?: File | string | null; // To display current file or AI placeholder
}

export interface Campaign {
  id: string;
  name: string;
  type: 'Email' | 'SMS' | 'HTML Bulk Email';
  status: 'Draft' | 'Scheduled' | 'Queued' | 'Sending' | 'Sent' | 'Failed' | 'Completed (Client Logged)';
  recipients: number;
  sentDate?: string;
  createdDate: string;
  // For tracking page
  opens?: number;
  clicks?: number;
  bounces?: number;
  ctr?: string; // Click-through rate
  openRate?: string;
  generatedByAI?: boolean;
}

export interface User {
  id: string;
  fullName: string;
  email: string; 
  role: 'user' | 'admin';
  registeredAt?: string;
  company?: string; // Optional company name for better AI prompts
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

export interface TelegramConfig {
  botToken: string;
  chatId: string;
}

export interface AuthContextType {
  isAuthenticated: boolean;
  user: User | null;
  login: (userData: User) => void;
  logout: () => void;
  isLoading: boolean;
  registerUser: (userData: Omit<User, 'id' | 'role' | 'registeredAt'>) => User;
  registeredUsers: User[];
  logUserActivity: (userId: string, activity: string) => void;
  getUserActivities: (userId: string) => UserActivity[];
  smtpConfigurations: SmtpConfiguration[];
  setSmtpConfigurations: (configs: SmtpConfiguration[]) => void;
  emailDrafts: EmailData[];
  setTelegramConfig: (config: TelegramConfig) => void;
  saveEmailDraft: (draft: EmailData) => void;
  deleteEmailDraft: (subject: string) => void;
  telegramConfig: TelegramConfig | null;
}

export interface UserActivity {
  id: string;
  timestamp: string;
  description: string;
  userId: string;
}

export interface EmailTemplate {
  id: string;
  name: string;
  subject: string; 
  body: string; 
  isHtml?: boolean;
  dynamicPlaceholders?: string[];
}

export interface AgentSpecificField {
  name: string; 
  label: string;
  type: 'text' | 'textarea' | 'file';
  placeholder?: string;
  fileAccept?: string;
  allowAIGeneration?: boolean; // New flag for AI file generation
}

export interface Agent {
  id: string;
  name: string;
  description: string;
  category?: string;
  icon?: React.ReactElement<IconProps>;
  templates: EmailTemplate[];
  drafts: EmailData[]; 
  specificFields?: AgentSpecificField[];
}

export interface HtmlBulkEmailData {
  campaignName: string;
  subject: string;
  htmlBody: string;
  recipientsManual: string;
  recipientFile: File | null;
  selectedSmtp: string; 
  generatedByAI?: boolean;
}

export interface ChatMessage {
  id: string;
  text: string;
  sender: 'user' | 'ai';
  timestamp: string;
}
