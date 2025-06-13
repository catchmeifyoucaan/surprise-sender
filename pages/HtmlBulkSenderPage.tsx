import React, { useState, useCallback, useEffect } from 'react';
import Input from '../components/common/Input';
import Textarea from '../components/common/Textarea';
import Button from '../components/common/Button';
import Select from '../components/common/Select';
import FileInput from '../components/common/FileInput';
import { HtmlBulkEmailData, SelectOption, Campaign } from '../types';
import { HtmlBulkIcon as PageIcon, SendIcon, SparklesIcon } from '../constants';
import { useAuth } from '../context/AuthContext';
import { generateTextSuggestion, isAiAvailable } from '../services/geminiService';
import LoadingSpinner from '../components/common/LoadingSpinner';
import { CheckCircleIcon } from '@heroicons/react/24/outline';

// A more complex HTML template for AI "generation"
const AI_GENERATED_HTML_TEMPLATE = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Special Announcement</title>
    <style>
        body { margin: 0; padding: 0; background-color: #f4f4f4; font-family: Arial, sans-serif; }
        .container { max-width: 600px; margin: 20px auto; background-color: #ffffff; padding: 20px; border-radius: 8px; box-shadow: 0 0 10px rgba(0,0,0,0.1); }
        .header { background-color: #0A0F1E; color: #E0E0E0; padding: 20px; text-align: center; border-top-left-radius: 8px; border-top-right-radius: 8px; }
        .header h1 { margin: 0; font-size: 24px; }
        .content { padding: 20px; color: #333333; line-height: 1.6; }
        .content h2 { color: #1A233A; }
        .content p { margin-bottom: 15px; }
        .button-container { text-align: center; margin-top: 20px; }
        .button { background-color: #38BDF8; color: #0A0F1E; padding: 12px 25px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block; }
        .footer { text-align: center; padding: 15px; font-size: 12px; color: #777777; border-top: 1px solid #eeeeee; margin-top: 20px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🎉 Exciting News from Our Company! 🎉</h1>
        </div>
        <div class="content">
            <h2>Hello {RecipientName},</h2>
            <p>We are thrilled to share a special update with you. Our team has been working hard, and we're now ready to unveil something amazing that we believe you'll love.</p>
            <p>This new initiative, codenamed <strong>Project Phoenix</strong>, is designed to enhance your experience and provide even more value. Expect innovative features, improved performance, and a refreshed look!</p>
            <p>Stay tuned for the official launch announcement next week. We can't wait for you to see what we've been up to.</p>
            <div class="button-container">
                <a href="https://example.com/learn-more" class="button">Learn More (Coming Soon)</a>
            </div>
        </div>
        <div class="footer">
            <p>&copy; ${new Date().getFullYear()} Your Company Name. All rights reserved.</p>
            <p><a href="https://example.com/unsubscribe" style="color: #777777;">Unsubscribe</a></p>
        </div>
    </div>
</body>
</html>
`;


const HtmlBulkSenderPage: React.FC = () => {
  const auth = useAuth();
  const [campaignData, setCampaignData] = useState<HtmlBulkEmailData>({
    campaignName: '',
    subject: '',
    htmlBody: '<h1>Your HTML Email Title</h1>\n<p>Start crafting your beautiful HTML email here. Use standard HTML tags.</p>\n<a href="https://example.com">Click Me!</a>',
    recipientsManual: '',
    recipientFile: null,
    selectedSmtp: auth.smtpConfigurations[0]?.id || '',
    generatedByAI: false,
  });
  const [isSending, setIsSending] = useState(false);
  const [formMessage, setFormMessage] = useState<string | null>(null);
  const [htmlPreview, setHtmlPreview] = useState(campaignData.htmlBody);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [isLoadingAiSubject, setIsLoadingAiSubject] = useState(false);
  const [isLoadingAiHtml, setIsLoadingAiHtml] = useState(false);
  const [emailSettings, setEmailSettings] = useState({
    trackOpens: true,
    trackClicks: true,
    unsubscribeLink: true,
    replyTo: '',
    fromName: '',
    priority: 'normal', // high, normal, low
    customHeaders: '',
    retryAttempts: 3,
    retryDelay: 5, // minutes
    batchSize: 50,
    delayBetweenBatches: 2, // minutes
  });
  const [deliverabilityChecks, setDeliverabilityChecks] = useState({
    spamScore: 0,
    dkimStatus: 'pending',
    spfStatus: 'pending',
    domainReputation: 'pending',
    ipReputation: 'pending',
  });
  const [selectedSmtpIds, setSelectedSmtpIds] = useState<string[]>([]);
  const [useAllSmtps, setUseAllSmtps] = useState(false);


  const smtpOptions: SelectOption[] = auth.smtpConfigurations.filter(smtp => smtp.isValid).map(cfg => ({
    value: cfg.id,
    label: cfg.label || `${cfg.host}:${cfg.port} (${cfg.user})`,
  }));

  useEffect(() => {
    const handler = setTimeout(() => {
      setHtmlPreview(campaignData.htmlBody);
    }, 300);
    return () => clearTimeout(handler);
  }, [campaignData.htmlBody]);

  useEffect(() => {
    const storedCampaigns = localStorage.getItem('surpriseSender_htmlBulkCampaigns');
    if (storedCampaigns) {
      setCampaigns(JSON.parse(storedCampaigns));
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('surpriseSender_htmlBulkCampaigns', JSON.stringify(campaigns));
  }, [campaigns]);


  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setCampaignData(prev => ({ ...prev, [name]: value, generatedByAI: name === 'htmlBody' ? false : prev.generatedByAI })); // Reset AI flag if body manually changed
  }, []);

  const handleFileSelect = useCallback((file: File | null | string) => { // FileInput can pass string now
    if (typeof file === 'string') { // This case might not be used here, but good for FileInput update
        console.warn("File input received string, not expected here:", file);
        return;
    }
    setCampaignData(prev => ({ ...prev, recipientFile: file as File | null }));
    if (file && auth.user) auth.logUserActivity(auth.user.id, `Recipient file selected for HTML bulk: (file object)`);
  }, [auth]);

  const handleSuggestSubject = async () => {
    if (!isAiAvailable() || !auth.user) {
      setFormMessage("AI features disabled or user not logged in.");
      return;
    }
    if (!campaignData.htmlBody.trim()) {
      setFormMessage("Please provide some HTML body content to suggest a subject.");
      return;
    }
    setIsLoadingAiSubject(true);
    setFormMessage("AI is generating subject suggestions...");
    const userContext = `User: ${auth.user.fullName}, Company: ${auth.user.company || 'their organization'}.`;
    const prompt = `As ${auth.user.fullName}, suggest a compelling email subject for an HTML bulk campaign. ${userContext} HTML Body (first 200 chars of text content): "${campaignData.htmlBody.replace(/<[^>]*>?/gm, '').substring(0, 200)}...". Provide only the subject line text.`;
    try {
      const suggestion = await generateTextSuggestion(prompt);
      if (!suggestion.startsWith("Error:")) {
        setCampaignData(prev => ({ ...prev, subject: suggestion.replace(/^["']|["']$/g, "") }));
        setFormMessage("AI subject suggestion applied!");
        auth.logUserActivity(auth.user.id, `AI suggested subject for HTML bulk campaign: ${suggestion}`);
      } else {
        setFormMessage(suggestion);
      }
    } catch (error: any) {
      setFormMessage(`Failed to get subject suggestion: ${error.message}`);
    }
    setIsLoadingAiSubject(false);
  };
  
  const handleGenerateHtmlWithAI = () => {
    if (!isAiAvailable() || !auth.user) {
      setFormMessage("AI features disabled or user not logged in.");
      return;
    }
    setIsLoadingAiHtml(true);
    setFormMessage("AI is generating HTML email structure...");
    // Simulate a prompt or get user input
    const descriptionPrompt = campaignData.campaignName || "a general promotional email"; 
    auth.logUserActivity(auth.user.id, `Initiated AI HTML generation for description: ${descriptionPrompt}`);

    setTimeout(() => {
      // For demonstration, we use a pre-defined template. A real scenario might involve a more complex AI call.
      setCampaignData(prev => ({ ...prev, htmlBody: AI_GENERATED_HTML_TEMPLATE, generatedByAI: true }));
      setFormMessage("AI has generated an HTML email template!");
      setIsLoadingAiHtml(false);
    }, 2500);
  };

  const checkDeliverability = useCallback(async () => {
    if (!campaignData.htmlBody || !campaignData.subject) return;
    
    try {
      const response = await fetch('/api/check-deliverability', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          html: campaignData.htmlBody,
          subject: campaignData.subject,
          fromName: emailSettings.fromName,
          replyTo: emailSettings.replyTo,
        }),
      });
      
      const data = await response.json();
      setDeliverabilityChecks(data);
    } catch (error) {
      console.error('Error checking deliverability:', error);
    }
  }, [campaignData.htmlBody, campaignData.subject, emailSettings.fromName, emailSettings.replyTo]);

  useEffect(() => {
    const debounceTimer = setTimeout(checkDeliverability, 1000);
    return () => clearTimeout(debounceTimer);
  }, [checkDeliverability]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSending(true);
    setFormMessage(null);
    const smtpIdsToUse = useAllSmtps ? auth.smtpConfigurations.map(cfg => cfg.id) : selectedSmtpIds;
    if (!campaignData.campaignName || !campaignData.subject || !campaignData.htmlBody || (!campaignData.recipientsManual && !campaignData.recipientFile) || smtpIdsToUse.length === 0) {
      setFormMessage("Error: Please fill all required fields including Campaign Name, Subject, HTML Body, Recipients, and select at least one SMTP Configuration.");
      setIsSending(false);
      return;
    }

    console.log('HTML Bulk Email Campaign Data:', campaignData);
    const activityDescription = `Submitted HTML Bulk Email campaign: ${campaignData.campaignName} via SMTP IDs ${smtpIdsToUse.join(', ')}`;
    if (auth.user) auth.logUserActivity(auth.user.id, activityDescription);
    
    setTimeout(() => {
      setIsSending(false);
      setFormMessage(`Campaign "${campaignData.campaignName}" logged for processing by backend via SMTP IDs ${smtpIdsToUse.join(', ')}.`);
      
      const newCampaignEntry: Campaign = {
        id: `html-c${Date.now().toString().slice(-6)}`,
        name: campaignData.campaignName,
        type: 'HTML Bulk Email',
        status: 'Queued', 
        recipients: campaignData.recipientsManual.split(/[,\n]/).filter(r => r.trim()).length + (campaignData.recipientFile ? 1000 : 0),
        sentDate: new Date().toISOString(), // Conceptual send date
        createdDate: new Date().toISOString(),
        generatedByAI: campaignData.generatedByAI,
      };
      setCampaigns(prev => [newCampaignEntry, ...prev]);
      setCampaignData({ campaignName: '', subject: '', htmlBody: '<p>Start new email...</p>', recipientsManual: '', recipientFile: null, selectedSmtp: smtpIdsToUse[0] || '', generatedByAI: false });

    }, 2000);
  };

  return (
    <div className="bg-secondary p-4 sm:p-6 rounded-lg shadow-xl min-h-full">
      <div className="flex items-center justify-between mb-6 border-b-2 border-accent pb-3">
        <h1 className="text-3xl font-bold text-text-primary flex items-center">
          <PageIcon className="w-8 h-8 mr-3 text-accent"/> HTML Bulk Email Sender
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
            : formMessage.toLowerCase().includes("ai is generating") || isLoadingAiHtml 
              ? 'bg-sky-800/70 text-sky-100' 
              : 'bg-green-800/70 text-green-100'
        }`}>
          {formMessage}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-6">
          <form onSubmit={handleSubmit} className="space-y-6 p-6 bg-primary rounded-lg shadow-2xl border border-slate-700">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Input
                label="Campaign Name"
                id="campaignName"
                name="campaignName"
                value={campaignData.campaignName}
                onChange={handleChange}
                placeholder="e.g., Product Launch HTML Blast"
                required
                className="bg-slate-800/50"
              />
              <div className="relative">
                <Input
                  label="Email Subject"
                  id="subject"
                  name="subject"
                  value={campaignData.subject}
                  onChange={handleChange}
                  placeholder="Your engaging HTML email subject"
                  required
                  className="bg-slate-800/50"
                />
                {isAiAvailable() && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={handleSuggestSubject}
                    isLoading={isLoadingAiSubject}
                    disabled={isLoadingAiSubject || !isAiAvailable()}
                    className="absolute right-1 bottom-1 text-accent hover:text-accent-light p-1"
                    aria-label="Suggest Subject with AI"
                    title="Suggest Subject with AI"
                  >
                    {!isLoadingAiSubject && <SparklesIcon className="w-5 h-5" />}
                    {isLoadingAiSubject && <LoadingSpinner size="sm" color="text-accent" />}
                  </Button>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Textarea
                label="Recipients (Email per line or comma-separated)"
                id="recipientsManual"
                name="recipientsManual"
                value={campaignData.recipientsManual}
                onChange={handleChange}
                placeholder="user1@example.com, user2@example.com\nuser3@example.com"
                rows={3}
                className="bg-slate-800/50"
              />
              <FileInput
                label="Upload Recipient List (.csv, .txt)"
                name="recipientFile"
                onFileSelect={handleFileSelect}
                currentValue={campaignData.recipientFile}
                accept=".csv,.txt"
                buttonText="Upload Recipient List"
                wrapperClassName="bg-slate-800/50"
              />
            </div>

            <div>
              <div className="flex justify-between items-center mb-2">
                <label htmlFor="htmlBody" className="block text-sm font-medium text-text-primary">
                  HTML Email Body
                </label>
                {isAiAvailable() && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={handleGenerateHtmlWithAI}
                    isLoading={isLoadingAiHtml}
                    disabled={isLoadingAiHtml}
                    leftIcon={<SparklesIcon className="w-4 h-4" />}
                    className="text-xs !py-0.5 text-accent hover:text-accent-light"
                  >
                    {isLoadingAiHtml ? "Generating..." : "Generate with AI"}
                  </Button>
                )}
              </div>
              <Textarea
                id="htmlBody"
                name="htmlBody"
                value={campaignData.htmlBody}
                onChange={handleChange}
                placeholder="Paste your raw HTML code here, or use 'Generate with AI'."
                rows={15}
                required
                className="font-mono text-sm bg-slate-800/50"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-text-primary mb-1">SMTP Configurations</label>
              <div className="flex items-center space-x-2 mb-2">
                <input
                  type="checkbox"
                  id="useAllSmtps"
                  checked={useAllSmtps}
                  onChange={() => {
                    setUseAllSmtps(!useAllSmtps);
                    if (!useAllSmtps) setSelectedSmtpIds([]);
                  }}
                  className="rounded border-slate-700 text-accent focus:ring-accent"
                />
                <label htmlFor="useAllSmtps" className="text-sm text-text-secondary">
                  Use All SMTP Configurations
                </label>
              </div>
              {!useAllSmtps && (
                <div className="max-h-40 overflow-y-auto space-y-1">
                  {auth.smtpConfigurations.filter(smtp => smtp.isValid).map((smtp) => (
                    <div key={smtp.id} className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id={smtp.id}
                        checked={selectedSmtpIds.includes(smtp.id)}
                        onChange={() => {
                          setSelectedSmtpIds(prev => prev.includes(smtp.id) ? prev.filter(id => id !== smtp.id) : [...prev, smtp.id]);
                        }}
                        className="rounded border-slate-700 text-accent focus:ring-accent"
                      />
                      <label htmlFor={smtp.id} className="text-sm text-text-secondary">
                        {smtp.label || `${smtp.host}:${smtp.port} (${smtp.user})`}
                      </label>
                    </div>
                  ))}
                </div>
              )}
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
                  <p className="text-xs text-text-secondary mt-1">Use a consistent, recognizable sender name</p>
                </div>
                
                <div>
                  <Input
                    label="Reply-To Email"
                    id="replyTo"
                    name="replyTo"
                    value={emailSettings.replyTo}
                    onChange={(e) => setEmailSettings(prev => ({ ...prev, replyTo: e.target.value }))}
                    placeholder="replies@yourdomain.com"
                    className="bg-slate-800/50"
                  />
                  <p className="text-xs text-text-secondary mt-1">Where replies should be sent</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <Select
                    label="Email Priority"
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
                
                <div>
                  <Input
                    label="Delay Between Batches (minutes)"
                    id="delayBetweenBatches"
                    name="delayBetweenBatches"
                    type="number"
                    value={emailSettings.delayBetweenBatches}
                    onChange={(e) => setEmailSettings(prev => ({ ...prev, delayBetweenBatches: parseInt(e.target.value) }))}
                    min="1"
                    max="60"
                    className="bg-slate-800/50"
                  />
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

          <div className="bg-primary p-6 rounded-lg shadow-2xl border border-slate-700">
            <h2 className="text-2xl font-semibold text-text-primary mb-4">HTML Campaigns Log</h2>
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
                            if(auth.user) auth.logUserActivity(auth.user.id, `Viewed details for HTML campaign: ${campaign.name}`);
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

        <div className="bg-primary p-6 rounded-lg shadow-2xl border border-slate-700 sticky top-4">
          <h2 className="text-xl font-semibold text-text-primary mb-3">Live HTML Preview</h2>
          <div className="relative">
            <div 
              className="w-full h-[600px] border border-slate-600 rounded bg-white text-black overflow-auto p-4"
              dangerouslySetInnerHTML={{ __html: htmlPreview }}
            />
            <div className="absolute top-2 right-2 bg-slate-800/90 text-text-secondary text-xs px-2 py-1 rounded">
              Preview Mode
            </div>
          </div>
          <p className="text-xs text-text-secondary mt-2">
            Note: Preview is rendered by the browser and may differ slightly from email clients.
          </p>

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
                    <span className="text-xs text-text-secondary block mb-1">Domain Reputation</span>
                    <span className={`text-sm ${
                      deliverabilityChecks.domainReputation === 'good' ? 'text-green-400' :
                      deliverabilityChecks.domainReputation === 'pending' ? 'text-yellow-400' :
                      'text-red-400'
                    }`}>
                      {deliverabilityChecks.domainReputation}
                    </span>
                  </div>
                  
                  <div className="p-3 bg-slate-800/50 rounded-lg">
                    <span className="text-xs text-text-secondary block mb-1">IP Reputation</span>
                    <span className={`text-sm ${
                      deliverabilityChecks.ipReputation === 'good' ? 'text-green-400' :
                      deliverabilityChecks.ipReputation === 'pending' ? 'text-yellow-400' :
                      'text-red-400'
                    }`}>
                      {deliverabilityChecks.ipReputation}
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
                    Keep HTML code clean and optimized for email clients
                  </span>
                </li>
                <li className="flex items-start">
                  <CheckCircleIcon className="w-5 h-5 text-green-400 mr-2 flex-shrink-0 mt-0.5" />
                  <span className="text-sm text-text-secondary">
                    Use inline CSS for better compatibility
                  </span>
                </li>
                <li className="flex items-start">
                  <CheckCircleIcon className="w-5 h-5 text-green-400 mr-2 flex-shrink-0 mt-0.5" />
                  <span className="text-sm text-text-secondary">
                    Include plain text version for better deliverability
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
                    Warm up your sending domain and IP gradually
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

export default HtmlBulkSenderPage;
