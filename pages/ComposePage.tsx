import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import Input from '../components/common/Input';
import Button from '../components/common/Button';
import Textarea from '../components/common/Textarea';
import Select from '../components/common/Select';
import { toast } from 'react-hot-toast';
import {
  PaperAirplaneIcon,
  SparklesIcon,
  DocumentTextIcon,
  TrashIcon,
  PaperClipIcon,
  ClockIcon,
  UserGroupIcon
} from '@heroicons/react/24/outline';
import { generateTextSuggestion, isAiAvailable } from '../services/geminiService';
import { email as emailApi, smtp as smtpApi } from '../services/api';

interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  body: string;
  category: string;
}

interface Recipient {
  email: string;
  name?: string;
}

const ComposePage: React.FC = () => {
  const auth = useAuth();
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [recipients, setRecipients] = useState<Recipient[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<string>('');
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isAiGenerating, setIsAiGenerating] = useState(false);
  const [scheduledTime, setScheduledTime] = useState<string>('');
  const [attachments, setAttachments] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [useAllSmtps, setUseAllSmtps] = useState(false);
  const [selectedSmtpIds, setSelectedSmtpIds] = useState<string[]>([]);

  useEffect(() => {
    if (auth.user) {
      auth.logUserActivity('Viewed Compose Page.');
      fetchTemplates();
    }
  }, [auth]);

  const fetchTemplates = async () => {
    try {
      const response = await fetch('/api/email/templates');
      if (!response.ok) throw new Error('Failed to fetch templates');
      const data = await response.json();
      setTemplates(data);
    } catch (error) {
      toast.error('Failed to load email templates');
    }
  };

  const handleTemplateSelect = (templateId: string) => {
    const template = templates.find(t => t.id === templateId);
    if (template) {
      setSubject(template.subject);
      setBody(template.body);
      setSelectedTemplate(templateId);
    }
  };

  const handleRecipientAdd = (email: string) => {
    if (!email.trim()) return;
    if (recipients.some(r => r.email === email)) {
      toast.error('Recipient already added');
      return;
    }
    setRecipients([...recipients, { email }]);
  };

  const handleRecipientRemove = (email: string) => {
    setRecipients(recipients.filter(r => r.email !== email));
  };

  const handleAttachmentAdd = (files: FileList | null) => {
    if (!files) return;
    const newAttachments = Array.from(files);
    setAttachments([...attachments, ...newAttachments]);
  };

  const handleAttachmentRemove = (index: number) => {
    setAttachments(attachments.filter((_, i) => i !== index));
  };

  const handleAiAssist = async (type: 'subject' | 'body') => {
    if (!isAiAvailable()) {
      toast.error('AI features are currently disabled');
      return;
    }

    setIsAiGenerating(true);
    try {
      const prompt = type === 'subject'
        ? `Generate a professional email subject line for: ${body.substring(0, 100)}...`
        : `Generate a professional email body for subject: ${subject}`;

      const suggestion = await generateTextSuggestion(prompt);
      if (type === 'subject') {
        setSubject(suggestion);
      } else {
        setBody(suggestion);
      }
      toast.success('AI suggestion generated');
    } catch (error) {
      toast.error('Failed to generate AI suggestion');
    } finally {
      setIsAiGenerating(false);
    }
  };

  const filesToBase64Attachments = async (files: File[]) => {
    const toBase64 = (file: File) => new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve((reader.result as string).split(',')[1] || '');
      reader.onerror = (e) => reject(e);
      reader.readAsDataURL(file);
    });
    const out = [] as any[];
    for (const f of files) {
      const b64 = await toBase64(f);
      out.push({ name: f.name, type: f.type, content: b64 });
    }
    return out;
  };

  const handleSend = async () => {
    if (!recipients.length) {
      toast.error('Please add at least one recipient');
      return;
    }
    if (!subject.trim()) {
      toast.error('Please enter a subject');
      return;
    }
    if (!body.trim()) {
      toast.error('Please enter a message');
      return;
    }

    const smtpIdsToUse = useAllSmtps ? auth.smtpConfigurations.filter(s => s.isValid).map(cfg => cfg.id) : selectedSmtpIds;
    if (smtpIdsToUse.length === 0) {
      toast.error('Select at least one SMTP');
      return;
    }

    setIsLoading(true);
    try {
      // Resolve selected SMTP configs
      const smtpList = await smtpApi.getConfigs();
      const configsArray = (Array.isArray(smtpList) ? smtpList : smtpList.configurations) || [];
      const smtpConfigs = configsArray.filter((c: any) => smtpIdsToUse.includes(c.id));
      if (smtpConfigs.length === 0) {
        toast.error('Selected SMTP config(s) not found');
        setIsLoading(false);
        return;
      }

      const attachmentsPayload = await filesToBase64Attachments(attachments);
      const emails = recipients.map((r) => ({ to: r.email, subject, body, isHtml: true, attachments: attachmentsPayload }));
      const result = await emailApi.sendBulk(emails as any, smtpConfigs as any, {});
      if (result?.success) {
        toast.success('Email(s) queued');
        setSubject('');
        setBody('');
        setRecipients([]);
        setAttachments([]);
        setSelectedTemplate('');
      } else {
        toast.error(result?.error || 'Send failed');
      }
    } catch (error) {
      toast.error('Failed to send email');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-2xl font-bold text-text-primary">Compose Email</h1>
          <div className="flex items-center space-x-4">
            <Button
              variant="secondary"
              onClick={() => (location.pathname !== '/templates' ? (window.history.pushState({}, '', '/templates'), window.dispatchEvent(new PopStateEvent('popstate'))) : null)}
            >
              <DocumentTextIcon className="w-5 h-5 mr-2" />
              Manage Templates
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-12 gap-6">
          {/* Main Content */}
          <div className="col-span-8">
            <div className="bg-primary rounded-lg shadow-lg p-6">
              {/* Recipients */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-text-secondary mb-2">
                  Recipients
                </label>
                <div className="flex flex-wrap gap-2 mb-2">
                  {recipients.map(recipient => (
                    <div
                      key={recipient.email}
                      className="bg-slate-700 rounded-full px-3 py-1 text-sm text-text-primary flex items-center"
                    >
                      <span>{recipient.email}</span>
                      <button
                        onClick={() => handleRecipientRemove(recipient.email)}
                        className="ml-2 text-text-secondary hover:text-text-primary"
                      >
                        <TrashIcon className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
                <div className="flex space-x-2">
                  <Input
                    placeholder="Add recipient email"
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        handleRecipientAdd((e.target as HTMLInputElement).value);
                        (e.target as HTMLInputElement).value = '';
                      }
                    }}
                  />
                  <Button
                    variant="secondary"
                    onClick={() => {
                      const input = document.querySelector('input[placeholder="Add recipient email"]') as HTMLInputElement;
                      if (input) {
                        handleRecipientAdd(input.value);
                        input.value = '';
                      }
                    }}
                  >
                    Add
                  </Button>
                </div>
              </div>

              {/* Subject */}
              <div className="mb-6">
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-medium text-text-secondary">
                    Subject
                  </label>
                  {isAiAvailable() && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleAiAssist('subject')}
                      disabled={isAiGenerating}
                    >
                      <SparklesIcon className="w-4 h-4 mr-1" />
                      AI Assist
                    </Button>
                  )}
                </div>
                <Input
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="Enter email subject"
                />
              </div>

              {/* Body */}
              <div className="mb-6">
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-medium text-text-secondary">
                    Message
                  </label>
                  {isAiAvailable() && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleAiAssist('body')}
                      disabled={isAiGenerating}
                    >
                      <SparklesIcon className="w-4 h-4 mr-1" />
                      AI Assist
                    </Button>
                  )}
                </div>
                <Textarea
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  placeholder="Write your message here..."
                  rows={12}
                />
              </div>

              {/* Attachments */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-text-secondary mb-2">
                  Attachments
                </label>
                <div className="flex flex-wrap gap-2 mb-2">
                  {attachments.map((file, index) => (
                    <div
                      key={index}
                      className="bg-slate-700 rounded-lg px-3 py-2 text-sm text-text-primary flex items-center"
                    >
                      <PaperClipIcon className="w-4 h-4 mr-2" />
                      <span>{file.name}</span>
                      <button
                        onClick={() => handleAttachmentRemove(index)}
                        className="ml-2 text-text-secondary hover:text-text-primary"
                      >
                        <TrashIcon className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={(e) => handleAttachmentAdd(e.target.files)}
                  multiple
                  className="hidden"
                />
                <Button
                  variant="secondary"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <PaperClipIcon className="w-5 h-5 mr-2" />
                  Add Attachments
                </Button>
              </div>

              {/* Schedule */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-text-secondary mb-2">
                  Schedule (Optional)
                </label>
                <Input
                  type="datetime-local"
                  value={scheduledTime}
                  onChange={(e) => setScheduledTime(e.target.value)}
                />
              </div>

              {/* SMTP Selection */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-text-secondary mb-2">SMTP Configurations</label>
                <div className="flex items-center space-x-2 mb-2">
                  <input type="checkbox" id="useAllSmtps" checked={useAllSmtps} onChange={() => { setUseAllSmtps(!useAllSmtps); if (!useAllSmtps) setSelectedSmtpIds([]); }} className="rounded border-slate-700 text-accent focus:ring-accent" />
                  <label htmlFor="useAllSmtps" className="text-sm text-text-secondary">Use All SMTP Configurations</label>
                </div>
                {!useAllSmtps && (
                  <div className="max-h-40 overflow-y-auto space-y-1">
                    {auth.smtpConfigurations.filter(s => s.isValid).map(smtp => (
                      <div key={smtp.id} className="flex items-center space-x-2">
                        <input type="checkbox" id={smtp.id} checked={selectedSmtpIds.includes(smtp.id)} onChange={() => setSelectedSmtpIds(prev => prev.includes(smtp.id) ? prev.filter(id => id !== smtp.id) : [...prev, smtp.id])} className="rounded border-slate-700 text-accent focus:ring-accent" />
                        <label htmlFor={smtp.id} className="text-sm text-text-secondary">{smtp.label || `${smtp.host}:${smtp.port} (${smtp.user})`}</label>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Send Button */}
              <div className="flex justify-end">
                <Button
                  onClick={handleSend}
                  disabled={isLoading}
                  className="w-40"
                >
                  {isLoading ? (
                    'Sending...'
                  ) : (
                    <>
                      <PaperAirplaneIcon className="w-5 h-5 mr-2" />
                      Send Email
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="col-span-4">
            <div className="space-y-6">
              {/* Templates */}
              <div className="bg-primary rounded-lg shadow-lg p-6">
                <h2 className="text-xl font-semibold text-text-primary mb-4">
                  Email Templates
                </h2>
                <Select
                  value={selectedTemplate}
                  onChange={(e) => handleTemplateSelect(e.target.value)}
                  options={[
                    { value: '', label: 'Select a template' },
                    ...templates.map(template => ({
                      value: template.id,
                      label: template.name
                    }))
                  ]}
                />
              </div>

              {/* Quick Stats */}
              <div className="bg-primary rounded-lg shadow-lg p-6">
                <h2 className="text-xl font-semibold text-text-primary mb-4">
                  Quick Stats
                </h2>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-text-secondary">Recipients</span>
                    <span className="text-text-primary">{recipients.length}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-text-secondary">Attachments</span>
                    <span className="text-text-primary">{attachments.length}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-text-secondary">Scheduled</span>
                    <span className="text-text-primary">
                      {scheduledTime ? 'Yes' : 'No'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ComposePage;
