import React, { useState } from 'react';
import { EmailData, SmtpConfiguration } from '../types';
import { EmailService } from '../services/emailService';
import { useAuth } from '../context/AuthContext';
import Button from './common/Button';

interface EmailSenderProps {
  onSuccess?: () => void;
  onError?: (error: string) => void;
  initialData?: Partial<EmailData>;
}

const EmailSender: React.FC<EmailSenderProps> = ({ onSuccess, onError, initialData }) => {
  const { smtpConfigurations } = useAuth();
  const [isSending, setIsSending] = useState(false);
  const [progress, setProgress] = useState(0);
  const [emailData, setEmailData] = useState<EmailData>({
    id: Date.now().toString(),
    to: initialData?.to || '',
    subject: initialData?.subject || '',
    body: initialData?.body || '',
    isHtml: initialData?.isHtml || false,
    timestamp: new Date().toISOString(),
  });
  const [selectedSmtp, setSelectedSmtp] = useState<string>(
    smtpConfigurations[0]?.id || ''
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSmtp) {
      onError?.('Please select an SMTP configuration');
      return;
    }

    const smtpConfig = smtpConfigurations.find(config => config.id === selectedSmtp);
    if (!smtpConfig) {
      onError?.('Selected SMTP configuration not found');
      return;
    }

    setIsSending(true);
    setProgress(0);

    try {
      const result = await EmailService.sendEmail(emailData, [smtpConfig]);
      if (result.success) {
        onSuccess?.();
      } else {
        onError?.(result.error || 'Failed to send email');
      }
    } catch (error) {
      onError?.('An unexpected error occurred');
    } finally {
      setIsSending(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-text-secondary mb-1">
          To
        </label>
        <input
          type="email"
          value={emailData.to}
          onChange={(e) => setEmailData(prev => ({ ...prev, to: e.target.value }))}
          className="w-full px-3 py-2 bg-primary border border-slate-700 rounded-md text-text-primary"
          required
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-text-secondary mb-1">
          Subject
        </label>
        <input
          type="text"
          value={emailData.subject}
          onChange={(e) => setEmailData(prev => ({ ...prev, subject: e.target.value }))}
          className="w-full px-3 py-2 bg-primary border border-slate-700 rounded-md text-text-primary"
          required
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-text-secondary mb-1">
          Message
        </label>
        <textarea
          value={emailData.body}
          onChange={(e) => setEmailData(prev => ({ ...prev, body: e.target.value }))}
          className="w-full px-3 py-2 bg-primary border border-slate-700 rounded-md text-text-primary min-h-[200px]"
          required
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-text-secondary mb-1">
          SMTP Configuration
        </label>
        <select
          value={selectedSmtp}
          onChange={(e) => setSelectedSmtp(e.target.value)}
          className="w-full px-3 py-2 bg-primary border border-slate-700 rounded-md text-text-primary"
          required
        >
          <option value="">Select SMTP Configuration</option>
          {smtpConfigurations.map((config) => (
            <option key={config.id} value={config.id}>
              {config.label || `${config.host}:${config.port}`}
            </option>
          ))}
        </select>
      </div>

      <div className="flex items-center space-x-2">
        <input
          type="checkbox"
          id="isHtml"
          checked={emailData.isHtml}
          onChange={(e) => setEmailData(prev => ({ ...prev, isHtml: e.target.checked }))}
          className="rounded border-slate-700 text-accent focus:ring-accent"
        />
        <label htmlFor="isHtml" className="text-sm text-text-secondary">
          Send as HTML
        </label>
      </div>

      {isSending && (
        <div className="w-full bg-slate-700 rounded-full h-2.5">
          <div
            className="bg-accent h-2.5 rounded-full transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      )}

      <Button
        type="submit"
        variant="primary"
        disabled={isSending}
        className="w-full"
      >
        {isSending ? 'Sending...' : 'Send Email'}
      </Button>
    </form>
  );
};

export default EmailSender; 