import React, { useEffect, useState, useCallback } from 'react';
import Input from '../components/common/Input';
import Textarea from '../components/common/Textarea';
import Button from '../components/common/Button';
import Select from '../components/common/Select';
import FileInput from '../components/common/FileInput';
import LoadingSpinner from '../components/common/LoadingSpinner';
import { useAuth } from '../context/AuthContext';
import Papa from 'papaparse';
import { email as emailApi, smtp as smtpApi } from '../services/api';
import { SMTPSelector, SmtpSelectorValue } from '../components/common/SMTPSelector';

const HtmlBulkSenderPage: React.FC = () => {
  const auth = useAuth();
  const [campaignName, setCampaignName] = useState('');
  const [subject, setSubject] = useState('');
  const [htmlBody, setHtmlBody] = useState('<h1>Your HTML Email Title</h1>');
  const [recipientsManual, setRecipientsManual] = useState('');
  const [recipientFile, setRecipientFile] = useState<File | null>(null);
  const [smtpSelection, setSmtpSelection] = useState<SmtpSelectorValue>({ mode: 'single', selectedIds: [] });
  const [isSending, setIsSending] = useState(false);
  const [formMessage, setFormMessage] = useState<string | null>(null);

  const [smtpList, setSmtpList] = useState<any[]>([]);
  useEffect(() => { (async () => { try { const list = await smtpApi.getConfigurations({ validated: true }); setSmtpList(list || []); } catch {} })(); }, []);
  const smtpItems = (smtpList || []).filter(s => s.isValid).map((s: any) => ({ id: s.id, host: s.host, port: s.port, username: s.username, label: s.label, isValid: s.isValid }));

  const handleFileSelect = useCallback((file: File | null | string) => {
    if (typeof file === 'string') return;
    setRecipientFile(file as File | null);
    if (file) auth.logUserActivity(`Recipient file selected for HTML bulk: ${(file as File).name}`);
  }, [auth]);

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
      const smtpIdsToUse = smtpSelection.mode === 'all' ? auth.smtpConfigurations.filter(cfg => cfg.isValid).map(cfg => cfg.id) : smtpSelection.selectedIds;
      if (!campaignName || !subject || !htmlBody || (!recipientsManual && !recipientFile) || smtpIdsToUse.length === 0) {
        setFormMessage('Error: Please fill all required fields including Campaign Name, Subject, HTML Body, Recipients, and select at least one SMTP.');
        setIsSending(false);
        return;
      }

      const allRecipients = await parseRecipients();
      if (allRecipients.length === 0) {
        setFormMessage('Error: No valid recipients found.');
        setIsSending(false);
        return;
      }

      const smtpList = await smtpApi.getConfigs();
      const configsArray = (Array.isArray(smtpList) ? smtpList : smtpList.configurations) || [];
      const smtpConfigs = configsArray.filter((c: any) => smtpIdsToUse.includes(c.id));
      if (smtpConfigs.length === 0) {
        setFormMessage('Error: Selected SMTP config(s) not found.');
        setIsSending(false);
        return;
      }

      const emails = allRecipients.map((to) => ({ to, subject, body: htmlBody, isHtml: true }));
      const result = await emailApi.sendBulk(emails as any, smtpConfigs as any, {});
      if (result?.success) {
        setFormMessage(`Queued. Total: ${result.data?.total || emails.length}, Sent: ${result.data?.sent || 0}, Failed: ${result.data?.failed || 0}`);
        auth.logUserActivity(`Submitted HTML Bulk Email campaign: ${campaignName}`);
        setCampaignName('');
        setSubject('');
        setHtmlBody('<p>Start new email...</p>');
        setRecipientsManual('');
        setRecipientFile(null);
        setSmtpSelection({ mode: 'single', selectedIds: [] });
      } else {
        setFormMessage(result?.error || 'Bulk HTML send failed');
      }
    } catch (err: any) {
      setFormMessage(`Error: ${err?.message || 'Bulk HTML send failed'}`);
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="bg-secondary p-4 sm:p-6 rounded-lg shadow-xl min-h-full">
      <div className="flex items-center justify-between mb-6 border-b-2 border-accent pb-3">
        <h1 className="text-3xl font-bold text-text-primary">HTML Bulk Email Sender</h1>
      </div>

      {formMessage && (
        <div className={`p-4 rounded-lg mb-6 ${
          formMessage.toLowerCase().includes('error') ? 'bg-red-900/70 text-red-100' : 'bg-green-800/70 text-green-100'
        }`}>
          {formMessage}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6 p-6 bg-primary rounded-lg shadow-2xl border border-slate-700">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Input label="Campaign Name" id="campaignName" name="campaignName" value={campaignName} onChange={(e) => setCampaignName(e.target.value)} required className="bg-slate-800/50" />
          <Input label="Email Subject" id="subject" name="subject" value={subject} onChange={(e) => setSubject(e.target.value)} required className="bg-slate-800/50" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Textarea label="Recipients (Email per line or comma-separated)" id="recipientsManual" name="recipientsManual" value={recipientsManual} onChange={(e) => setRecipientsManual(e.target.value)} rows={3} className="bg-slate-800/50" />
          <FileInput label="Upload Recipient List (.csv, .txt)" name="recipientFile" onFileSelect={handleFileSelect} currentValue={recipientFile} accept=".csv,.txt" buttonText="Upload Recipient List" wrapperClassName="bg-slate-800/50" />
        </div>

        <div>
          <Textarea id="htmlBody" name="htmlBody" value={htmlBody} onChange={(e) => setHtmlBody(e.target.value)} rows={12} required className="font-mono text-sm bg-slate-800/50" />
        </div>

        <SMTPSelector items={smtpItems} value={smtpSelection} onChange={setSmtpSelection} label="SMTP Configurations" />

        <div className="flex justify-end pt-4 border-t border-slate-700">
          <Button type="submit" variant="primary" isLoading={isSending} className="bg-accent hover:bg-accent-light">
            {isSending ? <LoadingSpinner size="sm" /> : 'Queue Campaign'}
          </Button>
        </div>
      </form>
    </div>
  );
};

export default HtmlBulkSenderPage;