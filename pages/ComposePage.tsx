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

  useEffect(() => {
    if (auth.user) {
      auth.logUserActivity(auth.user.id, 'Viewed Compose Page.');
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

    setIsLoading(true);
    try {
      const formData = new FormData();
      formData.append('subject', subject);
      formData.append('body', body);
      formData.append('recipients', JSON.stringify(recipients));
      formData.append('scheduledTime', scheduledTime);
      attachments.forEach(file => formData.append('attachments', file));

      const response = await fetch('/api/email/send', {
        method: 'POST',
        body: formData
      });

      if (!response.ok) throw new Error('Failed to send email');

      toast.success('Email sent successfully');
      setSubject('');
      setBody('');
      setRecipients([]);
      setAttachments([]);
      setScheduledTime('');
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
              onClick={() => window.location.href = '/templates'}
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
