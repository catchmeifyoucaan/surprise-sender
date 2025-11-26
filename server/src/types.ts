export interface EmailAttachment {
  name: string;
  type: string;
  content: any;
}

export interface EmailData {
  to: string;
  subject: string;
  body: string;
  isHtml?: boolean;
  cc?: string | string[];
  bcc?: string | string[];
  replyTo?: string;
  headers?: Record<string, string>;
  attachments?: EmailAttachment[];
  recipientMetadata?: {
    name?: string;
    company?: string;
    jobTitle?: string;
  };
}

