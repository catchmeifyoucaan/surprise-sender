import React, { useState, useCallback, useEffect } from 'react';
import Input from './common/Input';
import Textarea from './common/Textarea';
import Button from './common/Button';
import { EmailData, SmtpConfiguration } from '../types';
import { generateTextSuggestion, isAiAvailable } from '../services/geminiService';
import { SparklesIcon, SendIcon, HtmlIcon, SaveDraftIcon } from '../constants';
import LoadingSpinner from './common/LoadingSpinner';
import { useAuth } from '../context/AuthContext';
import { EmailService } from '../services/emailService';

interface EmailComposerProps {
  onSend: (email: EmailData) => void;
  initialData?: Partial<EmailData>;
  isSending?: boolean;
}

const EmailComposer: React.FC<EmailComposerProps> = ({ onSend, initialData, isSending }) => {
  const auth = useAuth();
  const [emailData, setEmailData] = useState<EmailData>({
    id: Date.now().toString(),
    to: initialData?.to || '',
    subject: initialData?.subject || '',
    body: initialData?.body || '',
    isHtml: initialData?.isHtml || false,
    timestamp: new Date().toISOString(),
  });
  const [isLoadingSubject, setIsLoadingSubject] = useState(false);
  const [isLoadingBody, setIsLoadingBody] = useState(false);
  const [isSendingEmail, setIsSendingEmail] = useState(isSending || false);
  const [composerMessage, setComposerMessage] = useState<string | null>(null);
  const [selectedSmtpIds, setSelectedSmtpIds] = useState<string[]>([]);
  const [useAllSmtps, setUseAllSmtps] = useState(false);
  const [draftSaved, setDraftSaved] = useState(false);

  // Auto-Drafting
  useEffect(() => {
    const saveDraft = () => {
      if (emailData.body || emailData.subject || emailData.to) {
        const draft: EmailData = {
          id: Date.now().toString(),
          to: emailData.to,
          subject: emailData.subject,
          body: emailData.body,
          isHtml: emailData.isHtml,
          timestamp: new Date().toISOString()
        };
        auth.saveEmailDraft(draft);
        setDraftSaved(true);
        setTimeout(() => setDraftSaved(false), 2000);
      }
    };

    const timer = setTimeout(saveDraft, 300000); // Save draft every 5 minutes
    return () => clearTimeout(timer);
  }, [emailData, auth]);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setEmailData(prev => ({ ...prev, [name]: value }));
  }, []);

  const toggleHtmlMode = () => {
    const newIsHtml = !emailData.isHtml;
    setEmailData(prev => ({ ...prev, isHtml: newIsHtml }));
    setComposerMessage(newIsHtml ? "Switched to HTML mode. Enter raw HTML." : "Switched to Rich Text mode.");
     if (auth.user) auth.logUserActivity(auth.user.id, `Toggled HTML mode to ${newIsHtml} in main composer.`);
  };

  const handleSuggestSubject = async () => {
    if (!isAiAvailable() || !auth.user) {
      setComposerMessage("AI features are disabled. API Key or user session might be missing.");
      return;
    }
    if (!emailData.body.trim() && !emailData.to.trim()) {
      setComposerMessage("Please provide recipient or some email body content to suggest a subject.");
      return;
    }
    setIsLoadingSubject(true);
    setComposerMessage("AI is generating subject...");
    const userContext = `User: ${auth.user.fullName}, Company: ${auth.user.company || 'their organization'}.`;
    const prompt = `As ${auth.user.fullName}, suggest a compelling email subject line. ${userContext} Email context: To: "${emailData.to}", Body (first 100 chars): "${emailData.body.substring(0, 100)}...". Provide only the subject line text.`;
    try {
      const suggestion = await generateTextSuggestion(prompt);
      if (!suggestion.startsWith("Error:")) {
        setEmailData(prev => ({ ...prev, subject: suggestion.replace(/^["']|["']$/g, "") }));
        setComposerMessage("AI subject suggestion applied!");
        auth.logUserActivity(auth.user.id, `AI suggested subject in main composer.`);
      } else {
        setComposerMessage(suggestion);
      }
    } catch (error: any) {
      setComposerMessage(`Failed to get subject suggestion: ${error.message}`);
    }
    setIsLoadingSubject(false);
  };

  const handleEnhanceBody = async () => {
     if (!isAiAvailable() || !auth.user) {
      setComposerMessage("AI features are disabled. API Key or user session might be missing.");
      return;
    }
    if (!emailData.body.trim()) {
      setComposerMessage("Please write some email body content to enhance.");
      return;
    }
    setIsLoadingBody(true);
    setComposerMessage("AI is enhancing body content...");
    const userContext = `User: ${auth.user.fullName}, Company: ${auth.user.company || 'their organization'}.`;
    const prompt = `As ${auth.user.fullName}, enhance the following email body content to be more professional, clear, and engaging. ${userContext} Keep the original intent. Original content: "${emailData.body}". Provide only the enhanced text. If current mode is HTML, provide enhanced HTML.`;
    try {
      const suggestion = await generateTextSuggestion(prompt);
       if (!suggestion.startsWith("Error:")) {
        setEmailData(prev => ({ ...prev, body: suggestion }));
        setComposerMessage("AI body enhancement applied!");
        auth.logUserActivity(auth.user.id, `AI enhanced body in main composer.`);
      } else {
        setComposerMessage(suggestion);
      }
    } catch (error: any) {
      setComposerMessage(`Failed to enhance body content: ${error.message}`);
    }
    setIsLoadingBody(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth.user) {
      setComposerMessage("Cannot send email. User not logged in.");
      return;
    }

    if (!auth.smtpConfigurations.length) {
      setComposerMessage("Cannot send email. No SMTP configuration found. Please add one in Settings.");
      return;
    }

    setIsSendingEmail(true);
    setComposerMessage("Sending email...");

    try {
      const selectedSmtpConfigs = useAllSmtps ? auth.smtpConfigurations : auth.smtpConfigurations.filter(config => selectedSmtpIds.includes(config.id));
      if (selectedSmtpConfigs.length === 0) {
        setComposerMessage("Please select at least one SMTP configuration to send the email.");
        setIsSendingEmail(false);
        return;
      }

      const result = await EmailService.sendEmail(emailData, selectedSmtpConfigs[0]);

      if (result.success) {
        setComposerMessage(`Email sent successfully to ${emailData.to}!`);
        if (auth.user) {
          auth.logUserActivity(auth.user.id, `Sent email to ${emailData.to}: ${emailData.subject}`);
        }
        setEmailData({ id: Date.now().toString(), to: '', subject: '', body: '', isHtml: false, timestamp: new Date().toISOString() }); // Clear form
        onSend(emailData);
      } else {
        setComposerMessage(`Failed to send email: ${result.error}`);
      }
    } catch (error: any) {
      setComposerMessage(`Error sending email: ${error.message}`);
    } finally {
      setIsSendingEmail(false);
    }
  };
  
  const handleSmtpSelection = (smtpId: string) => {
    setSelectedSmtpIds(prev => {
      if (prev.includes(smtpId)) {
        return prev.filter(id => id !== smtpId);
      }
      return [...prev, smtpId];
    });
  };

  const handleUseAllSmtps = () => {
    setUseAllSmtps(!useAllSmtps);
    if (!useAllSmtps) {
      setSelectedSmtpIds([]);
    }
  };

  return (
    <>
    <form onSubmit={handleSubmit} className="space-y-6 p-4 sm:p-6 bg-primary rounded-lg shadow-2xl border border-slate-700">
      {composerMessage && (
        <div className={`p-3 rounded-md text-sm ${composerMessage.toLowerCase().includes("error:") || composerMessage.toLowerCase().includes("disabled") || composerMessage.toLowerCase().includes("failed") || composerMessage.toLowerCase().includes("cannot save") ? 'bg-red-900 text-red-100' : composerMessage.toLowerCase().includes("draft") || composerMessage.toLowerCase().includes("auto-saved") || composerMessage.toLowerCase().includes("loaded") || composerMessage.toLowerCase().includes("deleted") ? 'bg-yellow-800 text-yellow-100' : composerMessage.toLowerCase().includes("ai is generating") || composerMessage.toLowerCase().includes("enhancing") ? 'bg-sky-800 text-sky-100' :'bg-green-800 text-green-100'}`}>
          {composerMessage}
        </div>
      )}
      <Input
        label="To"
        id="to"
        name="to"
        type="email"
        value={emailData.to}
        onChange={handleChange}
        placeholder="recipient@example.com"
        required
        wrapperClassName="relative"
      />
      
      <div className="relative">
        <Input
          label="Subject"
          id="subject"
          name="subject"
          type="text"
          value={emailData.subject}
          onChange={handleChange}
          placeholder="Your email subject"
          required
          wrapperClassName="flex-grow"
        />
        {isAiAvailable() && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleSuggestSubject}
            isLoading={isLoadingSubject}
            disabled={isLoadingSubject || !isAiAvailable()}
            className="absolute right-1 bottom-1 text-accent hover:text-sky-300 p-1"
            aria-label="Suggest Subject with AI"
            title="Suggest Subject with AI"
          >
            {!isLoadingSubject && <SparklesIcon className="w-5 h-5" />}
            {isLoadingSubject && <LoadingSpinner size="sm" color="text-accent"/>}
          </Button>
        )}
      </div>

      <div className="relative">
        <Textarea
          label={`Body (${emailData.isHtml ? "HTML Mode" : "Text Mode"})`}
          id="body"
          name="body"
          value={emailData.body}
          onChange={handleChange}
          placeholder={emailData.isHtml ? "Enter raw HTML code here..." : "Write your message here..."}
          rows={10}
          required
          wrapperClassName="flex-grow"
        />
        <div className="absolute right-1 top-0 mt-1 flex space-x-1">
            {isAiAvailable() && !emailData.isHtml && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleEnhanceBody}
                isLoading={isLoadingBody}
                disabled={isLoadingBody || !isAiAvailable()}
                className="text-accent hover:text-sky-300 p-1"
                aria-label="Enhance Body with AI"
                title="Enhance Body with AI"
              >
                {!isLoadingBody && <SparklesIcon className="w-5 h-5" />}
                {isLoadingBody && <LoadingSpinner size="sm" color="text-accent"/>}
              </Button>
            )}
            <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={toggleHtmlMode}
                className="text-accent hover:text-sky-300 p-1"
                aria-label={emailData.isHtml ? "Switch to Text Mode" : "Switch to HTML Mode"}
                title={emailData.isHtml ? "Switch to Text Mode" : "Switch to HTML Mode"}
              >
                <HtmlIcon className="w-5 h-5"/>
            </Button>
        </div>
      </div>

      {emailData.isHtml && (
        <div className="p-2 border border-slate-600 rounded bg-slate-800 max-h-40 overflow-y-auto">
            <h4 className="text-xs text-text-secondary mb-1">HTML Preview:</h4>
            <div className="text-xs prose prose-sm prose-invert max-w-none" dangerouslySetInnerHTML={{__html: emailData.body}}></div>
        </div>
      )}

      <div className="space-y-2">
        <div className="flex items-center space-x-2">
          <input
            type="checkbox"
            id="useAllSmtps"
            checked={useAllSmtps}
            onChange={handleUseAllSmtps}
            className="rounded border-slate-600 bg-slate-700 text-accent"
          />
          <label htmlFor="useAllSmtps" className="text-sm text-text-secondary">
            Use All SMTP Configurations
          </label>
        </div>

        {!useAllSmtps && (
          <div className="space-y-2">
            <label className="block text-sm font-medium text-text-secondary">
              Select SMTP Configurations:
            </label>
            <div className="max-h-40 overflow-y-auto space-y-1">
              {auth.smtpConfigurations.filter(smtp => smtp.isValid).map((smtp) => (
                <div key={smtp.id} className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id={smtp.id}
                    checked={selectedSmtpIds.includes(smtp.id)}
                    onChange={() => handleSmtpSelection(smtp.id)}
                    className="rounded border-slate-600 bg-slate-700 text-accent"
                  />
                  <label htmlFor={smtp.id} className="text-sm text-text-secondary">
                    {smtp.label || `${smtp.host}:${smtp.port}`}
                  </label>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="flex justify-between items-center pt-4">
        <div className="flex space-x-2">
          <Button
            type="submit"
            variant="primary"
            isLoading={isSendingEmail}
            disabled={isSendingEmail || !emailData.to || !emailData.subject || !emailData.body || (!useAllSmtps && selectedSmtpIds.length === 0)}
            className="bg-accent hover:bg-accent/80"
          >
            <SendIcon className="w-5 h-5 mr-2" />
            Send Now
          </Button>
        </div>
      </div>
       {!isAiAvailable() && (
        <p className="text-xs text-amber-400 text-center mt-2">AI features are disabled. Configure API_KEY to enable them.</p>
      )}
    </form>

    {auth.emailDrafts.length > 0 && (
        <div className="mt-8 p-4 bg-primary rounded-lg shadow-lg border border-slate-700">
            <h3 className="text-lg font-semibold text-text-primary mb-3">Saved Drafts</h3>
            <ul className="space-y-2 max-h-48 overflow-y-auto">
                {auth.emailDrafts.map((draft, index) => (
                    <li key={`${draft.subject}-${index}`} className="flex justify-between items-center p-2 bg-slate-700 rounded hover:bg-slate-600">
                        <span className="text-sm text-text-secondary truncate cursor-pointer hover:text-accent" onClick={() => {
                            setEmailData(draft);
                            setComposerMessage(`Draft "${draft.subject || 'Untitled'}" loaded.`);
                            if (auth.user) auth.logUserActivity(auth.user.id, `Loaded draft: ${draft.subject || 'Untitled'}`);
                        }}>
                           To: {draft.to || 'N/A'} - Subject: {draft.subject || 'Untitled Draft'}
                        </span>
                        <div>
                            <Button size="sm" variant="ghost" onClick={() => {
                                setEmailData(draft);
                                setComposerMessage(`Draft "${draft.subject || 'Untitled'}" loaded.`);
                                if (auth.user) auth.logUserActivity(auth.user.id, `Loaded draft: ${draft.subject || 'Untitled'}`);
                            }} className="mr-1 !p-1 text-sky-400">Load</Button>
                            <Button size="sm" variant="danger" onClick={() => {
                                auth.deleteEmailDraft(draft.subject || '');
                                setComposerMessage(`Draft "${draft.subject || 'Untitled'}" deleted.`);
                                if (auth.user) auth.logUserActivity(auth.user.id, `Deleted draft: ${draft.subject || 'Untitled'}`);
                            }} className="!p-1">Delete</Button>
                        </div>
                    </li>
                ))}
            </ul>
        </div>
    )}
    </>
  );
};

export default EmailComposer;
