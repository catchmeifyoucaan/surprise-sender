import { z } from 'zod';

// User validation schemas
export const UserRegistrationSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(100, 'Name must be less than 100 characters'),
  email: z.string().email('Invalid email format'),
  password: z.string().min(8, 'Password must be at least 8 characters').regex(
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/,
    'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character'
  ),
  company: z.string().optional(),
  role: z.enum(['admin', 'manager', 'user', 'viewer']).default('user'),
});

export const UserLoginSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(1, 'Password is required'),
});

export const UserUpdateSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  email: z.string().email().optional(),
  company: z.string().optional(),
  role: z.enum(['admin', 'manager', 'user', 'viewer']).optional(),
  status: z.enum(['active', 'inactive', 'suspended', 'pending']).optional(),
});

// SMTP Configuration validation schemas
export const SmtpConfigurationSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  host: z.string().min(1, 'Host is required'),
  port: z.number().int().min(1).max(65535),
  username: z.string().min(1, 'Username is required'),
  password: z.string().min(1, 'Password is required'),
  secure: z.boolean().default(false),
  isActive: z.boolean().default(true),
  maxEmailsPerDay: z.number().int().min(1).max(100000).default(1000),
  providerType: z.enum(['smtp', 'webmail', 'api']).default('smtp'),
  webmailProvider: z.string().optional(),
  apiProvider: z.string().optional(),
  apiKey: z.string().optional(),
  region: z.string().optional(),
  fromEmail: z.string().email().optional(),
  fromName: z.string().optional(),
});

export const SmtpValidationSchema = z.object({
  configs: z.array(SmtpConfigurationSchema),
});

// Email validation schemas
export const EmailDataSchema = z.object({
  to: z.string().email('Invalid recipient email'),
  subject: z.string().min(1, 'Subject is required').max(200, 'Subject too long'),
  body: z.string().min(1, 'Email body is required'),
  isHtml: z.boolean().default(false),
  cc: z.array(z.string().email()).optional(),
  bcc: z.array(z.string().email()).optional(),
  replyTo: z.string().email().optional(),
  templateId: z.string().optional(),
  attachments: z.array(z.any()).optional(),
});

export const SendEmailSchema = z.object({
  emailData: EmailDataSchema,
  smtpConfigs: z.union([
    SmtpConfigurationSchema,
    z.array(SmtpConfigurationSchema)
  ]),
});

// Campaign validation schemas
export const CampaignSchema = z.object({
  name: z.string().min(1, 'Campaign name is required').max(100),
  type: z.enum(['email', 'sms', 'html']),
  recipients: z.array(z.string().email()).min(1, 'At least one recipient required'),
  subject: z.string().min(1, 'Subject is required').max(200),
  body: z.string().min(1, 'Body is required'),
  isHtml: z.boolean().default(false),
  scheduleDateTime: z.string().datetime().optional(),
  smtpConfigId: z.string().uuid().optional(),
  settings: z.object({
    retryAttempts: z.number().int().min(0).max(10).default(3),
    retryDelay: z.number().int().min(1).max(60).default(5),
    batchSize: z.number().int().min(1).max(1000).default(50),
    delayBetweenBatches: z.number().int().min(1).max(60).default(2),
    trackOpens: z.boolean().default(true),
    trackClicks: z.boolean().default(true),
    unsubscribeLink: z.boolean().default(true),
    priority: z.enum(['high', 'normal', 'low']).default('normal'),
  }).optional(),
});

// Agent validation schemas
export const AgentSchema = z.object({
  name: z.string().min(1, 'Agent name is required').max(100),
  description: z.string().min(1, 'Description is required').max(500),
  category: z.string().min(1, 'Category is required'),
  specificFields: z.array(z.object({
    name: z.string().min(1),
    label: z.string().min(1),
    type: z.enum(['text', 'textarea', 'file']),
    placeholder: z.string().optional(),
    fileAccept: z.string().optional(),
    allowAIGeneration: z.boolean().default(false),
  })).default([]),
  templates: z.array(z.object({
    id: z.string().uuid(),
    name: z.string().min(1),
    subject: z.string().min(1),
    body: z.string().min(1),
    isHtml: z.boolean().default(false),
    dynamicPlaceholders: z.array(z.string()).default([]),
  })).default([]),
  aiConfig: z.object({
    model: z.string().default('gpt-3.5-turbo'),
    temperature: z.number().min(0).max(2).default(0.7),
    maxTokens: z.number().int().min(1).max(4000).default(2000),
    stopSequences: z.array(z.string()).default([]),
    systemPrompt: z.string().optional(),
    examples: z.array(z.object({
      input: z.string(),
      output: z.string(),
    })).default([]),
  }).optional(),
});

// API Key validation schemas
export const ApiKeySchema = z.object({
  name: z.string().min(1, 'API key name is required').max(100),
  service: z.enum(['openai', 'gemini', 'claude', 'telegram', 'email']),
  key: z.string().min(1, 'API key is required'),
  isActive: z.boolean().default(true),
  permissions: z.array(z.string()).default([]),
});

// File upload validation schemas
export const FileUploadSchema = z.object({
  file: z.any().refine((file) => file && file.size > 0, 'File is required'),
  type: z.enum(['csv', 'xlsx', 'json']).optional(),
  maxSize: z.number().int().min(1).max(10 * 1024 * 1024).default(5 * 1024 * 1024), // 5MB default
});

// Pagination and filtering schemas
export const PaginationSchema = z.object({
  page: z.number().int().min(1).default(1),
  limit: z.number().int().min(1).max(100).default(20),
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
  search: z.string().optional(),
  filters: z.record(z.any()).optional(),
});

// Activity logging schema
export const ActivityLogSchema = z.object({
  userId: z.string().uuid(),
  description: z.string().min(1, 'Activity description is required'),
  metadata: z.record(z.any()).optional(),
  type: z.enum(['info', 'warning', 'error', 'success']).default('info'),
});

// Response schemas for consistent API responses
export const ApiResponseSchema = <T extends z.ZodTypeAny>(dataSchema: T) =>
  z.object({
    success: z.boolean(),
    data: dataSchema.optional(),
    error: z.string().optional(),
    message: z.string().optional(),
    timestamp: z.string().datetime(),
  });

export const PaginatedResponseSchema = <T extends z.ZodTypeAny>(itemSchema: T) =>
  z.object({
    success: z.boolean(),
    data: z.array(itemSchema),
    pagination: z.object({
      page: z.number(),
      limit: z.number(),
      total: z.number(),
      totalPages: z.number(),
      hasNext: z.boolean(),
      hasPrev: z.boolean(),
    }),
    error: z.string().optional(),
  });