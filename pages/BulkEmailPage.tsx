import React, { useState, useCallback, useEffect } from 'react';
import Input from '../components/common/Input';
import Textarea from '../components/common/Textarea';
import Button from '../components/common/Button';
import Select from '../components/common/Select';
import FileInput from '../components/common/FileInput';
import { SelectOption, Campaign } from '../types';
import { SparklesIcon, SendIcon, PaperAirplaneIcon } from '../constants';
import LoadingSpinner from '../components/common/LoadingSpinner';
import { generateTextSuggestion, isAiAvailable } from '../services/geminiService';
import { useAuth } from '../context/AuthContext';
import { CheckCircleIcon } from '@heroicons/react/24/outline';
import Papa from 'papaparse';
import { email as emailApi, smtp as smtpApi } from '../services/api';
import { SMTPSelector, SmtpSelectorValue } from '../components/common/SMTPSelector';

const predefinedTemplates: SelectOption[] = [ 
  { value: 'newsletter_tpl', label: 'Monthly Newsletter Template' },
  { value: 'promo_tpl', label: 'Promotional Offer Template' },
  { value: 'event_tpl', label: 'Event Invitation Template' },
  { value: 'plain_tpl', label: 'Plain Text Update' },
];

const BulkEmailPage: React.FC = () => {
  const auth = useAuth();
  const [campaignName, setCampaignName] = useState('');
  const [recipientsManual, setRecipientsManual] = useState('');
  const [recipientFile, setRecipientFile] = useState<File | null>(null);
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState<string>('');
  const [scheduleDateTime, setScheduleDateTime] = useState('');
  const [smtpSelection, setSmtpSelection] = useState<SmtpSelectorValue>({ mode: 'single', selectedIds: [] });

  const [isLoadingSubject, setIsLoadingSubject] = useState(false);
  const [isLoadingBody, setIsLoadingBody] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [formMessage, setFormMessage] = useState<string | null>(null);

  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  
  const smtpOptions: SelectOption[] = auth.smtpConfigurations.map(cfg => ({
    value: cfg.id,
    label: cfg.label || `${cfg.host}:${cfg.port} (${cfg.user})`,
  }));

  const [emailSettings, setEmailSettings] = useState({
    fromName: '',
    replyTo: '',
    scheduleTime: '',
    retryAttempts: 3,
    retryDelay: 5, // minutes
    batchSize: 50,
    delayBetweenBatches: 2, // minutes
    trackOpens: true,
    trackClicks: true,
    unsubscribeLink: true,
    priority: 'normal', // high, normal, low
  });

  const [deliverabilityChecks, setDeliverabilityChecks] = useState({
    spamScore: 0,
    domainStatus: 'pending',
    dkimStatus: 'pending',
    spfStatus: 'pending',
    dmarcStatus: 'pending',
    blacklistStatus: 'pending',
  });

  useEffect(() => {
    const storedCampaigns = localStorage.getItem('surpriseSender_bulkEmailCampaigns');
    if (storedCampaigns) {
      setCampaigns(JSON.parse(storedCampaigns));
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('surpriseSender_bulkEmailCampaigns', JSON.stringify(campaigns));
  }, [campaigns]);

  const handleFileSelect = useCallback((file: File | null | string) => {
    if (typeof file === 'string') return; // Should not happen for this component
    setRecipientFile(file as File | null);
    if (file) auth.logUserActivity(`Recipient file selected for bulk email: ${(file as File).name}`);
  }, [auth]);
  
  const handleSuggestSubject = async () => {
    if (!isAiAvailable() || !auth.user) {
      setFormMessage("AI features are disabled. API Key or user session might be missing.");
      return;
    }
    if (!body.trim() && !recipientsManual.trim() && !recipientFile) {
      setFormMessage("Please provide some email body content or recipient info to suggest a subject.");
      return;
    }
    setIsLoadingSubject(true);
    setFormMessage("AI is generating subject suggestions...");
    const userContext = `User: ${auth.user.fullName}, Company: ${auth.user.company || 'their organization'}.`;
    const prompt = `As ${auth.user.fullName}, suggest a compelling email subject for a bulk campaign. ${userContext} Email Body (first 100 chars): "${body.substring(0, 100)}...". Provide only the subject line text.`;
    try {
      const suggestion = await generateTextSuggestion(prompt);
      if (!suggestion.startsWith("Error:")) {
        setSubject(suggestion.replace(/^ ["']|["']$/g, ""));
        setFormMessage("AI subject suggestion applied!");
        auth.logUserActivity(`AI suggested subject for bulk email: ${suggestion}`);
      } else {
        setFormMessage(suggestion);
      }
    } catch (error: any) {
      setFormMessage(`Failed to get subject suggestion: ${error.message}`);
    }
    setIsLoadingSubject(false);
  };

  const handleEnhanceBody = async () => {
     if (!isAiAvailable() || !auth.user) {
      setFormMessage("AI features are disabled. API Key or user session might be missing.");
      return;
    }
    if (!body.trim()) {
      setFormMessage("Please write some email body content to enhance.");
      return;
    }
    setIsLoadingBody(true);
    setFormMessage("AI is enhancing body content...");
    const userContext = `User: ${auth.user.fullName}, Company: ${auth.user.company || 'their organization'}.`;
    const prompt = `As ${auth.user.fullName}, enhance the following bulk email body content to be professional, clear, and engaging for a wide audience. ${userContext} Keep the original intent. Original content: "${body}". Provide only the enhanced text.`;
    try {
      const suggestion = await generateTextSuggestion(prompt);
       if (!suggestion.startsWith("Error:")) {
        setBody(suggestion);
        setFormMessage("AI body enhancement applied!");
        auth.logUserActivity(`AI enhanced body for bulk email.`);
      } else {
        setFormMessage(suggestion);
      }
    } catch (error: any) {
      setFormMessage(`Failed to enhance body content: ${error.message}`);
    }
    setIsLoadingBody(false);
  };

  const parseRecipients = async (): Promise<string[]> => {
    const manual = recipientsManual
      .split(/\n|,|\s/)
      .map(s => s.trim())
      .filter(Boolean);
    if (!recipientFile) return manual;
    const fileParsed: string[] = await new Promise((resolve, reject) => {
      Papa.parse(recipientFile as File, {
        header: false,
        skipEmptyLines: true,
        complete: (result) => {
          try {
            const rows = result.data as any[];
            const all: string[] = [];
            rows.forEach((row) => {
              const cells = Array.isArray(row) ? row : Object.values(row);
              cells.forEach((cell: any) => {
                const candidate = String(cell || '').trim();
                if (candidate.includes('@')) all.push(candidate);
              });
            });
            resolve(all);
          } catch (e) {
            reject(e);
          }
        },
        error: (err) => reject(err)
      });
    });
    return [...manual, ...fileParsed];
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSending(true);
    setFormMessage(null);

    try {
      const smtpIdsToUse = smtpSelection.mode === 'all' ? auth.smtpConfigurations.filter(s => s.isValid).map(cfg => cfg.id) : smtpSelection.selectedIds;
      if (!campaignName || !subject || !body || (!recipientsManual && !recipientFile) || smtpIdsToUse.length === 0) {
        setFormMessage('Error: Please fill all required fields including Campaign Name, Subject, Body, Recipients, and select at least one SMTP Configuration.');
        setIsSending(false);
        return;
      }

      const allRecipients = await parseRecipients();
      if (allRecipients.length === 0) {
        setFormMessage('Error: No valid recipients found.');
        setIsSending(false);
        return;
      }

      // Resolve selected SMTP configs
      const smtpList = await smtpApi.getConfigs();
      const configsArray = (Array.isArray(smtpList) ? smtpList : smtpList.configurations) || [];
      const smtpConfigs = configsArray.filter((c: any) => smtpIdsToUse.includes(c.id));
      if (smtpConfigs.length === 0) {
        setFormMessage('Error: Selected SMTP config(s) not found.');
        setIsSending(false);
        return;
      }

      const emails = allRecipients.map((to) => ({ to, subject, body, isHtml: true }));
      const options = {
        batchSize: emailSettings.batchSize,
        delayBetweenBatches: emailSettings.delayBetweenBatches * 1000,
        retryAttempts: emailSettings.retryAttempts,
        retryDelay: emailSettings.retryDelay * 1000
      };

      const result = await emailApi.sendBulk(emails as any, smtpConfigs as any, options);
      if (result?.success) {
        setFormMessage(`Campaign "${campaignName}" queued. Total: ${result.data?.total || emails.length}, Sent: ${result.data?.sent || 0}, Failed: ${result.data?.failed || 0}`);
        auth.logUserActivity(`Submitted Bulk Email campaign: ${campaignName} via ${smtpConfigs.length} SMTP(s)`);
        const newCampaignEntry: Campaign = {
          id: `c${Date.now().toString().slice(-6)}`,
          name: campaignName || 'Untitled Campaign',
          type: 'Email',
          status: scheduleDateTime ? 'Scheduled' : 'Queued',
          recipients: allRecipients.length,
          sentDate: scheduleDateTime || new Date().toISOString(),
          createdDate: new Date().toISOString(),
        };
        setCampaigns(prev => [newCampaignEntry, ...prev]);
        // Clear form
        setCampaignName('');
        setRecipientsManual('');
        setRecipientFile(null);
        setSubject('');
        setBody('');
        setSelectedTemplate('');
        setScheduleDateTime('');
        setSmtpSelection({ mode: 'single', selectedIds: [] });
      } else {
        setFormMessage(result?.error || 'Bulk send failed');
      }
    } catch (err: any) {
      setFormMessage(`Error: ${err?.message || 'Bulk send failed'}`);
    } finally {
      setIsSending(false);
    }
  };

  const checkDeliverability = useCallback(async () => {
    if (!subject || !body || !emailSettings.fromName) return;
    
    try {
      const response = await fetch('/api/check-email-deliverability', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subject,
          body,
          fromName: emailSettings.fromName,
          trackOpens: emailSettings.trackOpens,
          trackClicks: emailSettings.trackClicks,
        }),
      });
      
      const data = await response.json();
      setDeliverabilityChecks(data);
    } catch (error) {
      // ignore
    }
  }, [subject, body, emailSettings]);

  useEffect(() => {
    checkDeliverability();
  }, [checkDeliverability]);

  const smtpItems = auth.smtpConfigurations.filter(s => s.isValid).map(s => ({ id: s.id, host: (s as any).host, port: (s as any).port, username: (s as any).user, label: (s as any).label, isValid: s.isValid }));

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-2xl font-bold text-text-primary">Bulk Email</h1>
        </div>

        <form onSubmit={handleSubmit} className="grid grid-cols-12 gap-6">
          <div className="col-span-8">
            <div className="bg-primary rounded-lg shadow-lg p-6 space-y-6">
              <Input label="Campaign Name" value={campaignName} onChange={(e) => setCampaignName(e.target.value)} required className="bg-slate-800/50" />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Textarea label="Recipients (Email per line or comma-separated)" value={recipientsManual} onChange={(e) => setRecipientsManual(e.target.value)} rows={4} className="bg-slate-800/50" />
                <FileInput label="Upload Recipient List (.csv, .txt)" onFileSelect={handleFileSelect} currentValue={recipientFile} accept=".csv,.txt" buttonText="Upload Recipient List" wrapperClassName="bg-slate-800/50" />
              </div>
              <Input label="Subject" value={subject} onChange={(e) => setSubject(e.target.value)} required className="bg-slate-800/50" />
              <Textarea label="Body" value={body} onChange={(e) => setBody(e.target.value)} rows={8} className="bg-slate-800/50" />

              <SMTPSelector items={smtpItems} value={smtpSelection} onChange={setSmtpSelection} label="SMTP Configurations" />

              <div className="flex justify-end">
                <Button type="submit" variant="primary" isLoading={isSending} className="w-40">
                  {isSending ? <LoadingSpinner /> : (<><PaperAirplaneIcon className="w-5 h-5 mr-2" /> Queue</>)}
                </Button>
              </div>
            </div>
          </div>

          <div className="col-span-4">
            <div className="bg-primary rounded-lg shadow-lg p-6 space-y-6">
              <Select
                value={selectedTemplate}
                onChange={(e) => setSelectedTemplate(e.target.value)}
                options={[{ value: '', label: 'Select a template' }, ...predefinedTemplates]}
              />
              {/* deliverability panel omitted for brevity */}
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default BulkEmailPage;
