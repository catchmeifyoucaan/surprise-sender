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
  const [selectedSmtp, setSelectedSmtp] = useState<string>(auth.smtpConfigurations[0]?.id || '');

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
    if (file && auth.user) auth.logUserActivity(auth.user.id, `Recipient file selected for bulk email: ${(file as File).name}`);
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
        setSubject(suggestion.replace(/^["']|["']$/g, ""));
        setFormMessage("AI subject suggestion applied!");
        auth.logUserActivity(auth.user.id, `AI suggested subject for bulk email: ${suggestion}`);
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
        auth.logUserActivity(auth.user.id, `AI enhanced body for bulk email.`);
      } else {
        setFormMessage(suggestion);
      }
    } catch (error: any) {
      setFormMessage(`Failed to enhance body content: ${error.message}`);
    }
    setIsLoadingBody(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSending(true);
    setFormMessage(null);

    if (!campaignName || !subject || !body || (!recipientsManual && !recipientFile) || !selectedSmtp) {
        setFormMessage("Error: Please fill all required fields including Campaign Name, Subject, Body, Recipients, and select an SMTP Configuration.");
        setIsSending(false);
        return;
    }

    const campaignDataToLog = { campaignName, recipientsManual: recipientsManual.length, recipientFile: recipientFile?.name, subject, bodyLength: body.length, selectedTemplate, scheduleDateTime, selectedSmtp };
    console.log('Bulk Email Campaign Data:', campaignDataToLog);
    if(auth.user) auth.logUserActivity(auth.user.id, `Submitted Bulk Email campaign: ${campaignName} via SMTP ID ${selectedSmtp}`);
    
    setTimeout(() => {
      setIsSending(false);
      setFormMessage(`Campaign "${campaignName}" queued for sending via SMTP ID ${selectedSmtp}.`);
      
      const newCampaignEntry: Campaign = {
        id: `c${Date.now().toString().slice(-6)}`,
        name: campaignName || 'Untitled Campaign',
        type: 'Email',
        status: scheduleDateTime ? 'Scheduled' : 'Queued',
        recipients: recipientsManual.split(',').filter(r => r.trim()).length + (recipientFile ? 1000 : 0), 
        sentDate: scheduleDateTime || new Date().toISOString(), // Conceptual, actual send is backend
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
      //setSelectedSmtp(auth.smtpConfigurations[0]?.id || ''); // Keep SMTP or reset as needed
    }, 2000);
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
      console.error('Error checking deliverability:', error);
    }
  }, [subject, body, emailSettings.fromName, emailSettings.trackOpens, emailSettings.trackClicks]);

  useEffect(() => {
    const debounceTimer = setTimeout(checkDeliverability, 1000);
    return () => clearTimeout(debounceTimer);
  }, [checkDeliverability]);

  return (
    <div className="bg-secondary p-4 sm:p-6 rounded-lg shadow-xl min-h-full">
      <div className="flex items-center justify-between mb-6 border-b-2 border-accent pb-3">
        <h1 className="text-3xl font-bold text-text-primary flex items-center">
          <PaperAirplaneIcon className="w-8 h-8 mr-3 text-accent"/> Bulk Email Sender
        </h1>
        {!isAiAvailable() && (
          <div className="bg-amber-900/50 text-amber-200 px-4 py-2 rounded-lg flex items-center">
            <SparklesIcon className="w-5 h-5 mr-2"/>
            <span className="text-sm">AI features are disabled. Configure API_KEY to enable them.</span>
          </div>
        )}
      </div>

      {formMessage && (
        <div className={`p-4 rounded-lg mb-6 ${
          formMessage.toLowerCase().includes("error") 
            ? 'bg-red-900/70 text-red-100' 
            : formMessage.toLowerCase().includes("ai is generating") || isLoadingSubject 
              ? 'bg-sky-800/70 text-sky-100' 
              : 'bg-green-800/70 text-green-100'
        }`}>
          {formMessage}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Form Section */}
        <div className="space-y-6">
          <form onSubmit={handleSubmit} className="space-y-6 p-6 bg-primary rounded-lg shadow-2xl border border-slate-700">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Input
                label="Campaign Name"
                id="campaignName"
                name="campaignName"
                value={campaignName}
                onChange={(e) => setCampaignName(e.target.value)}
                placeholder="e.g., Product Launch Email"
                required
                className="bg-slate-800/50"
              />
              <div className="relative">
                <Input
                  label="Email Subject"
                  id="subject"
                  name="subject"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="Your engaging email subject"
                  required
                  className="bg-slate-800/50"
                />
                {isAiAvailable() && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={handleSuggestSubject}
                    isLoading={isLoadingSubject}
                    disabled={isLoadingSubject}
                    className="absolute right-1 bottom-1 text-accent hover:text-accent-light p-1"
                    aria-label="Suggest Subject with AI"
                    title="Suggest Subject with AI"
                  >
                    {!isLoadingSubject && <SparklesIcon className="w-5 h-5" />}
                    {isLoadingSubject && <LoadingSpinner size="sm" color="text-accent" />}
                  </Button>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Textarea
                label="Recipients (Email per line or comma-separated)"
                id="recipientsManual"
                name="recipientsManual"
                value={recipientsManual}
                onChange={(e) => setRecipientsManual(e.target.value)}
                placeholder="user1@example.com, user2@example.com\nuser3@example.com"
                rows={3}
                className="bg-slate-800/50"
              />
              <FileInput
                label="Upload Recipient List (.csv, .txt)"
                name="recipientFile"
                onFileSelect={handleFileSelect}
                currentValue={recipientFile}
                accept=".csv,.txt"
                buttonText="Upload Recipient List"
                wrapperClassName="bg-slate-800/50"
              />
            </div>

            <div>
              <div className="flex justify-between items-center mb-2">
                <label htmlFor="body" className="block text-sm font-medium text-text-primary">
                  Email Body
                </label>
                {isAiAvailable() && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={handleEnhanceBody}
                    isLoading={isLoadingBody}
                    disabled={isLoadingBody}
                    leftIcon={<SparklesIcon className="w-4 h-4" />}
                    className="text-xs !py-0.5 text-accent hover:text-accent-light"
                  >
                    {isLoadingBody ? "Enhancing..." : "Enhance with AI"}
                  </Button>
                )}
              </div>
              <Textarea
                id="body"
                name="body"
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder="Enter your email content here..."
                rows={10}
                required
                className="bg-slate-800/50"
              />
            </div>

            <div>
              <Select
                label="SMTP Configuration"
                id="selectedSmtp"
                name="selectedSmtp"
                options={smtpOptions.length > 0 ? smtpOptions : [{value: '', label: 'No SMTP Configurations Saved'}]}
                value={selectedSmtp}
                onChange={(e) => setSelectedSmtp(e.target.value)}
                required
                disabled={smtpOptions.length === 0}
                placeholder="-- Select SMTP --"
                className="bg-slate-800/50"
              />
              <p className="text-xs text-text-secondary mt-1">Select from globally configured SMTPs. Add more in Settings.</p>
            </div>

            <div className="space-y-6 border-t border-slate-700 pt-6">
              <h3 className="text-lg font-semibold text-text-primary">Advanced Settings</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <Input
                    label="From Name"
                    id="fromName"
                    name="fromName"
                    value={emailSettings.fromName}
                    onChange={(e) => setEmailSettings(prev => ({ ...prev, fromName: e.target.value }))}
                    placeholder="Your Company Name"
                    className="bg-slate-800/50"
                  />
                </div>
                
                <div>
                  <Input
                    label="Reply-To Email"
                    id="replyTo"
                    name="replyTo"
                    type="email"
                    value={emailSettings.replyTo}
                    onChange={(e) => setEmailSettings(prev => ({ ...prev, replyTo: e.target.value }))}
                    placeholder="replies@yourcompany.com"
                    className="bg-slate-800/50"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <Input
                    label="Schedule Time (Optional)"
                    id="scheduleTime"
                    name="scheduleTime"
                    type="datetime-local"
                    value={emailSettings.scheduleTime}
                    onChange={(e) => setEmailSettings(prev => ({ ...prev, scheduleTime: e.target.value }))}
                    className="bg-slate-800/50"
                  />
                </div>
                
                <div>
                  <Select
                    label="Message Priority"
                    id="priority"
                    name="priority"
                    options={[
                      { value: 'high', label: 'High Priority' },
                      { value: 'normal', label: 'Normal Priority' },
                      { value: 'low', label: 'Low Priority' },
                    ]}
                    value={emailSettings.priority}
                    onChange={(e) => setEmailSettings(prev => ({ ...prev, priority: e.target.value }))}
                    className="bg-slate-800/50"
                  />
                </div>
                
                <div>
                  <Input
                    label="Batch Size"
                    id="batchSize"
                    name="batchSize"
                    type="number"
                    value={emailSettings.batchSize}
                    onChange={(e) => setEmailSettings(prev => ({ ...prev, batchSize: parseInt(e.target.value) }))}
                    min="1"
                    max="100"
                    className="bg-slate-800/50"
                  />
                  <p className="text-xs text-text-secondary mt-1">Emails per batch</p>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center space-x-4">
                  <label className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={emailSettings.trackOpens}
                      onChange={(e) => setEmailSettings(prev => ({ ...prev, trackOpens: e.target.checked }))}
                      className="form-checkbox h-4 w-4 text-accent"
                    />
                    <span className="text-sm text-text-primary">Track Opens</span>
                  </label>
                  
                  <label className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={emailSettings.trackClicks}
                      onChange={(e) => setEmailSettings(prev => ({ ...prev, trackClicks: e.target.checked }))}
                      className="form-checkbox h-4 w-4 text-accent"
                    />
                    <span className="text-sm text-text-primary">Track Clicks</span>
                  </label>
                  
                  <label className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={emailSettings.unsubscribeLink}
                      onChange={(e) => setEmailSettings(prev => ({ ...prev, unsubscribeLink: e.target.checked }))}
                      className="form-checkbox h-4 w-4 text-accent"
                    />
                    <span className="text-sm text-text-primary">Add Unsubscribe Link</span>
                  </label>
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-4 border-t border-slate-700">
              <Button 
                type="submit" 
                variant="primary" 
                leftIcon={<SendIcon />} 
                isLoading={isSending} 
                disabled={isSending || smtpOptions.length === 0}
                className="bg-accent hover:bg-accent-light"
              >
                Queue Campaign
              </Button>
            </div>
          </form>

          {/* Campaigns Log */}
          <div className="bg-primary p-6 rounded-lg shadow-2xl border border-slate-700">
            <h2 className="text-2xl font-semibold text-text-primary mb-4">Email Campaigns Log</h2>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-700">
                <thead className="bg-slate-800">
                  <tr>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">Name</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">Status</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">Recipients</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">Date</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-primary divide-y divide-slate-700">
                  {campaigns.map(campaign => (
                    <tr key={campaign.id} className="hover:bg-slate-700/30 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-text-primary">
                        {campaign.name}
                        {campaign.generatedByAI && (
                          <SparklesIcon className="w-3 h-3 inline-block ml-1 text-accent" />
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          campaign.status === 'Sent' || campaign.status === 'Completed (Client Logged)' 
                            ? 'bg-green-700 text-green-100' 
                            : campaign.status === 'Scheduled' 
                              ? 'bg-yellow-700 text-yellow-100' 
                              : campaign.status === 'Draft' 
                                ? 'bg-gray-600 text-gray-100' 
                                : campaign.status === 'Queued' || campaign.status === 'Sending' 
                                  ? 'bg-blue-700 text-blue-100' 
                                  : 'bg-red-700 text-red-100'
                        }`}>
                          {campaign.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-text-secondary">
                        {campaign.recipients.toLocaleString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-text-secondary">
                        {new Date(campaign.sentDate || campaign.createdDate).toLocaleString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => {
                            if(auth.user) auth.logUserActivity(auth.user.id, `Viewed details for email campaign: ${campaign.name}`);
                            alert(`Viewing details for ${campaign.name} - not fully implemented.`);
                          }} 
                          className="text-accent hover:text-accent-light"
                        >
                          View Details
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Preview Section */}
        <div className="bg-primary p-6 rounded-lg shadow-2xl border border-slate-700 sticky top-4">
          <h2 className="text-xl font-semibold text-text-primary mb-3">Email Preview</h2>
          <div className="relative">
            <div className="w-full min-h-[400px] border border-slate-600 rounded bg-white text-black overflow-auto p-4">
              <div className="mb-4">
                <h3 className="text-lg font-semibold text-gray-800">{subject || "Subject will appear here..."}</h3>
              </div>
              <div className="prose prose-sm max-w-none">
                {body ? (
                  <div dangerouslySetInnerHTML={{ __html: body }} />
                ) : (
                  <p className="text-gray-500">Your email content will appear here...</p>
                )}
              </div>
            </div>
            <div className="absolute top-2 right-2 bg-slate-800/90 text-text-secondary text-xs px-2 py-1 rounded">
              Preview Mode
            </div>
          </div>
          <div className="mt-4 space-y-4">
            <div className="p-4 bg-slate-800/50 rounded-lg">
              <h3 className="text-sm font-medium text-text-primary mb-2">Quick Templates</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {predefinedTemplates.map((template, index) => (
                  <Button
                    key={index}
                    variant="ghost"
                    size="sm"
                    onClick={() => setSelectedTemplate(template.value.toString())}
                    className="text-left text-text-secondary hover:text-text-primary hover:bg-slate-700/50"
                  >
                    {template.label}
                  </Button>
                ))}
              </div>
            </div>
            <div className="p-4 bg-slate-800/50 rounded-lg">
              <h3 className="text-sm font-medium text-text-primary mb-2">Tips</h3>
              <ul className="text-xs text-text-secondary space-y-1">
                <li>• Keep subject lines under 60 characters</li>
                <li>• Use AI generation for engaging content</li>
                <li>• Test your email before sending</li>
                <li>• Include a clear call-to-action</li>
              </ul>
            </div>
          </div>
          <div className="mt-6 space-y-6">
            <div className="bg-primary p-6 rounded-lg shadow-2xl border border-slate-700">
              <h3 className="text-lg font-semibold text-text-primary mb-4">Deliverability Check</h3>
              
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-text-primary">Spam Score</span>
                  <div className="flex items-center">
                    <div className={`w-24 h-2 rounded-full overflow-hidden bg-slate-700 mr-2`}>
                      <div 
                        className={`h-full ${
                          deliverabilityChecks.spamScore < 3 ? 'bg-green-500' :
                          deliverabilityChecks.spamScore < 5 ? 'bg-yellow-500' :
                          'bg-red-500'
                        }`}
                        style={{ width: `${(deliverabilityChecks.spamScore / 10) * 100}%` }}
                      />
                    </div>
                    <span className={`text-sm ${
                      deliverabilityChecks.spamScore < 3 ? 'text-green-400' :
                      deliverabilityChecks.spamScore < 5 ? 'text-yellow-400' :
                      'text-red-400'
                    }`}>
                      {deliverabilityChecks.spamScore}/10
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="p-3 bg-slate-800/50 rounded-lg">
                    <span className="text-xs text-text-secondary block mb-1">Domain Status</span>
                    <span className={`text-sm ${
                      deliverabilityChecks.domainStatus === 'valid' ? 'text-green-400' :
                      deliverabilityChecks.domainStatus === 'pending' ? 'text-yellow-400' :
                      'text-red-400'
                    }`}>
                      {deliverabilityChecks.domainStatus}
                    </span>
                  </div>
                  
                  <div className="p-3 bg-slate-800/50 rounded-lg">
                    <span className="text-xs text-text-secondary block mb-1">DKIM Status</span>
                    <span className={`text-sm ${
                      deliverabilityChecks.dkimStatus === 'valid' ? 'text-green-400' :
                      deliverabilityChecks.dkimStatus === 'pending' ? 'text-yellow-400' :
                      'text-red-400'
                    }`}>
                      {deliverabilityChecks.dkimStatus}
                    </span>
                  </div>
                  
                  <div className="p-3 bg-slate-800/50 rounded-lg">
                    <span className="text-xs text-text-secondary block mb-1">SPF Status</span>
                    <span className={`text-sm ${
                      deliverabilityChecks.spfStatus === 'valid' ? 'text-green-400' :
                      deliverabilityChecks.spfStatus === 'pending' ? 'text-yellow-400' :
                      'text-red-400'
                    }`}>
                      {deliverabilityChecks.spfStatus}
                    </span>
                  </div>
                  
                  <div className="p-3 bg-slate-800/50 rounded-lg">
                    <span className="text-xs text-text-secondary block mb-1">DMARC Status</span>
                    <span className={`text-sm ${
                      deliverabilityChecks.dmarcStatus === 'valid' ? 'text-green-400' :
                      deliverabilityChecks.dmarcStatus === 'pending' ? 'text-yellow-400' :
                      'text-red-400'
                    }`}>
                      {deliverabilityChecks.dmarcStatus}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-primary p-6 rounded-lg shadow-2xl border border-slate-700">
              <h3 className="text-lg font-semibold text-text-primary mb-4">Best Practices</h3>
              
              <ul className="space-y-3">
                <li className="flex items-start">
                  <CheckCircleIcon className="w-5 h-5 text-green-400 mr-2 flex-shrink-0 mt-0.5" />
                  <span className="text-sm text-text-secondary">
                    Keep subject lines under 50 characters
                  </span>
                </li>
                <li className="flex items-start">
                  <CheckCircleIcon className="w-5 h-5 text-green-400 mr-2 flex-shrink-0 mt-0.5" />
                  <span className="text-sm text-text-secondary">
                    Use a consistent sender name and email
                  </span>
                </li>
                <li className="flex items-start">
                  <CheckCircleIcon className="w-5 h-5 text-green-400 mr-2 flex-shrink-0 mt-0.5" />
                  <span className="text-sm text-text-secondary">
                    Avoid spam trigger words and excessive punctuation
                  </span>
                </li>
                <li className="flex items-start">
                  <CheckCircleIcon className="w-5 h-5 text-green-400 mr-2 flex-shrink-0 mt-0.5" />
                  <span className="text-sm text-text-secondary">
                    Test your email across different email clients
                  </span>
                </li>
                <li className="flex items-start">
                  <CheckCircleIcon className="w-5 h-5 text-green-400 mr-2 flex-shrink-0 mt-0.5" />
                  <span className="text-sm text-text-secondary">
                    Warm up your sending domain gradually
                  </span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BulkEmailPage;
