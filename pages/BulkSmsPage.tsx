import React, { useCallback, useEffect, useState } from 'react';
import Input from '../components/common/Input';
import Textarea from '../components/common/Textarea';
import Button from '../components/common/Button';
import FileInput from '../components/common/FileInput';
import { useAuth } from '../context/AuthContext';
import Papa from 'papaparse';
import { sms as smsApi } from '../services/api';

const BulkSmsPage: React.FC = () => {
  const auth = useAuth();
  const [campaignName, setCampaignName] = useState('');
  const [recipientsManual, setRecipientsManual] = useState('');
  const [recipientFile, setRecipientFile] = useState<File | null>(null);
  const [message, setMessage] = useState('');
  const [selectedGateway, setSelectedGateway] = useState('');
  const [senderId, setSenderId] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [formMessage, setFormMessage] = useState<string | null>(null);

  const handleFileSelect = useCallback((file: File | null | string) => {
    if (typeof file === 'string') return;
    setRecipientFile(file as File | null);
    if (file) auth.logUserActivity(`Recipient file selected for bulk SMS: ${(file as File).name}`);
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
                if (candidate) all.push(candidate);
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
      if (!campaignName || !message || (!recipientsManual && !recipientFile) || !selectedGateway || !senderId) {
        setFormMessage('Error: Fill Campaign, Message, Recipients, Sender ID, and Gateway.');
        setIsSending(false);
        return;
      }
      if (senderId.length > 11 && !/^\d+$/.test(senderId)) { // Alphanumeric max 11
        setFormMessage('Error: Alphanumeric Sender ID cannot be more than 11 characters.');
        setIsSending(false);
        return;
      }
      if (senderId.length > 15 && /^\d+$/.test(senderId)) { // Numeric max 15
        setFormMessage('Error: Numeric Sender ID cannot be more than 15 digits.');
        setIsSending(false);
        return;
      }

      const recipients = await parseRecipients();
      if (recipients.length === 0) {
        setFormMessage('Error: No valid recipients found.');
        setIsSending(false);
        return;
      }

      const result = await smsApi.sendBulk(recipients, message, {
        senderId,
        gateway: selectedGateway
      });
      if (result?.success) {
        setFormMessage(`Queued. Total: ${result.data?.total || recipients.length}, Sent: ${result.data?.sent || 0}, Failed: ${result.data?.failed || 0}`);
        auth.logUserActivity(`Submitted Bulk SMS campaign: ${campaignName} via Gateway ${selectedGateway}`);
        setCampaignName('');
        setRecipientsManual('');
        setRecipientFile(null);
        setMessage('');
        setSelectedGateway('');
        setSenderId('');
      } else {
        setFormMessage(result?.error || 'Bulk SMS send failed');
      }
    } catch (err: any) {
      setFormMessage(`Error: ${err?.message || 'Bulk SMS send failed'}`);
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="bg-secondary p-4 sm:p-6 rounded-lg shadow-xl min-h-full">
      <div className="flex items-center justify-between mb-6 border-b-2 border-accent pb-3">
        <h1 className="text-3xl font-bold text-text-primary">Bulk SMS Sender</h1>
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
          <Input label="SMS Gateway" id="selectedGateway" name="selectedGateway" value={selectedGateway} onChange={(e) => setSelectedGateway(e.target.value)} required className="bg-slate-800/50" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Textarea label="Recipients (Phone per line or comma-separated)" id="recipientsManual" name="recipientsManual" value={recipientsManual} onChange={(e) => setRecipientsManual(e.target.value)} rows={3} className="bg-slate-800/50" />
          <FileInput label="Upload Recipient List (.csv, .txt)" name="recipientFile" onFileSelect={handleFileSelect} currentValue={recipientFile} accept=".csv,.txt" buttonText="Upload Recipient List" wrapperClassName="bg-slate-800/50" />
        </div>

        <div>
          <Textarea id="message" name="message" value={message} onChange={(e) => setMessage(e.target.value)} rows={4} required maxLength={160} className="bg-slate-800/50" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Input label="Sender ID" id="senderId" name="senderId" value={senderId} onChange={(e) => setSenderId(e.target.value)} placeholder="Your Company" className="bg-slate-800/50" />
        </div>

        <div className="flex justify-end pt-4 border-t border-slate-700">
          <Button type="submit" variant="primary" isLoading={isSending} className="bg-accent hover:bg-accent-light">
            Queue Campaign
          </Button>
        </div>
      </form>
    </div>
  );
};

export default BulkSmsPage;