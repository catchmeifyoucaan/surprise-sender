import React, { useState, useCallback, useEffect } from 'react';
import Input from '../components/common/Input';
import Textarea from '../components/common/Textarea';
import Button from '../components/common/Button';
import Select from '../components/common/Select';
import FileInput from '../components/common/FileInput';
import { SelectOption, Campaign } from '../types';
import { SparklesIcon, SendIcon, BulkSmsIcon as PageIcon } from '../constants';
import LoadingSpinner from '../components/common/LoadingSpinner';
import { generateTextSuggestion, isAiAvailable } from '../services/geminiService';
import { useAuth } from '../context/AuthContext';
import { CheckCircleIcon } from '@heroicons/react/24/outline';

const predefinedSmsTemplates: SelectOption[] = [ 
  { value: 'otp_tpl', label: 'OTP Verification Template' },
  { value: 'reminder_tpl', label: 'Appointment Reminder Template' },
  { value: 'flash_sale_tpl', label: 'Flash Sale Alert Template' },
];

const predefinedSmsGateways: SelectOption[] = [ 
  { value: 'gateway_ng_a', label: 'Nigerian Gateway Alpha' },
  { value: 'gateway_ng_b', label: 'Nigerian Gateway Beta' },
  { value: 'gateway_global_c', label: 'Global Gateway Gamma' },
];


const MAX_SMS_CHARS_SINGLE = 160;
const MAX_SMS_CHARS_CONCAT = 153; // Max chars for subsequent parts of a concatenated SMS

const BulkSmsPage: React.FC = () => {
  const auth = useAuth();
  const [campaignName, setCampaignName] = useState('');
  const [recipientsManual, setRecipientsManual] = useState('');
  const [recipientFile, setRecipientFile] = useState<File | null>(null);
  const [message, setMessage] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState<string>('');
  const [scheduleDateTime, setScheduleDateTime] = useState('');
  const [selectedGateway, setSelectedGateway] = useState<string>('');
  const [senderId, setSenderId] = useState('');

  const [isLoadingMessage, setIsLoadingMessage] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [formMessage, setFormMessage] = useState<string | null>(null);
  
  const [charCount, setCharCount] = useState(0);
  const [smsParts, setSmsParts] = useState(1);
  
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);

  const [smsSettings, setSmsSettings] = useState({
    senderId: '',
    scheduleTime: '',
    retryAttempts: 3,
    retryDelay: 5, // minutes
    batchSize: 50,
    delayBetweenBatches: 2, // minutes
    useUnicode: false,
    concatenate: true,
    flashMessage: false,
    priority: 'normal', // high, normal, low
  });

  const [deliverabilityChecks, setDeliverabilityChecks] = useState({
    spamScore: 0,
    carrierStatus: 'pending',
    numberFormat: 'pending',
    gatewayStatus: 'pending',
    routeStatus: 'pending',
  });

  useEffect(() => {
    const count = message.length;
    setCharCount(count);
    if (count === 0) {
      setSmsParts(0);
    } else if (count <= MAX_SMS_CHARS_SINGLE) {
      setSmsParts(1);
    } else {
      // For multi-part SMS, each part uses fewer characters due to headers
      setSmsParts(Math.ceil(count / MAX_SMS_CHARS_CONCAT));
    }
  }, [message]);

  useEffect(() => {
    const storedCampaigns = localStorage.getItem('surpriseSender_bulkSmsCampaigns');
    if (storedCampaigns) {
      setCampaigns(JSON.parse(storedCampaigns));
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('surpriseSender_bulkSmsCampaigns', JSON.stringify(campaigns));
  }, [campaigns]);


  const handleFileSelect = useCallback((file: File | null | string) => {
    if (typeof file === 'string') return; // Should not happen
    setRecipientFile(file as File | null);
    if (file && auth.user) auth.logUserActivity(auth.user.id, `Recipient file selected for bulk SMS: ${(file as File).name}`);
  }, [auth]);

  const handleSuggestMessage = async () => {
    if (!isAiAvailable() || !auth.user) {
      setFormMessage("AI features are disabled. API Key or user session might be missing.");
      return;
    }
    if (!campaignName && !recipientsManual && !recipientFile) {
      setFormMessage("Please provide campaign name or recipient info to suggest an SMS message.");
      return;
    }
    setIsLoadingMessage(true);
    setFormMessage("AI is generating SMS message...");
    const userContext = `User: ${auth.user.fullName}, Company: ${auth.user.company || 'their organization'}.`;
    const prompt = `As ${auth.user.fullName}, suggest a concise and effective SMS message for a bulk campaign named "${campaignName}". ${userContext} Keep it under 160 characters. Provide only the SMS text.`;
    try {
      const suggestion = await generateTextSuggestion(prompt);
      if (!suggestion.startsWith("Error:")) {
        setMessage(suggestion.substring(0, MAX_SMS_CHARS_SINGLE * 3)); // Allow a bit more for editing
        setFormMessage("AI SMS suggestion applied!");
        auth.logUserActivity(auth.user.id, `AI suggested SMS message for campaign: ${campaignName}`);
      } else {
        setFormMessage(suggestion);
      }
    } catch (error: any) {
      setFormMessage(`Failed to get SMS message suggestion: ${error.message}`);
    }
    setIsLoadingMessage(false);
  };
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSending(true);
    setFormMessage(null);

    if (!campaignName || !message || (!recipientsManual && !recipientFile) || !selectedGateway || !senderId) {
        setFormMessage("Error: Please fill all required fields: Campaign Name, Message, Recipients, Sender ID, and select an SMS Gateway.");
        setIsSending(false);
        return;
    }
    if (senderId.length > 11 && !/^\d+$/.test(senderId)) { // Alphanumeric max 11
        setFormMessage("Error: Alphanumeric Sender ID cannot be more than 11 characters.");
        setIsSending(false);
        return;
    }
     if (senderId.length > 15 && /^\d+$/.test(senderId)) { // Numeric max 15
        setFormMessage("Error: Numeric Sender ID cannot be more than 15 digits.");
        setIsSending(false);
        return;
    }


    const smsCampaignDataToLog = { campaignName, recipientsManual: recipientsManual.length, recipientFile: recipientFile?.name, message, senderId, selectedTemplate, scheduleDateTime, selectedGateway };
    console.log('Bulk SMS Campaign Data:', smsCampaignDataToLog);
    if(auth.user) auth.logUserActivity(auth.user.id, `Submitted Bulk SMS campaign: ${campaignName} via Gateway ${selectedGateway}`);
    
    setTimeout(() => {
      setIsSending(false);
      setFormMessage(`SMS Campaign "${campaignName}" queued for sending via ${selectedGateway}.`);
      
      const newCampaignEntry: Campaign = {
        id: `s${Date.now().toString().slice(-6)}`,
        name: campaignName || 'Untitled SMS Campaign',
        type: 'SMS',
        status: scheduleDateTime ? 'Scheduled' : 'Queued',
        recipients: recipientsManual.split(/[,\n]/).filter(r => r.trim()).length + (recipientFile ? 500 : 0), 
        sentDate: scheduleDateTime || new Date().toISOString(),
        createdDate: new Date().toISOString(),
      };
      setCampaigns(prev => [newCampaignEntry, ...prev]);
      // Clear form
      setCampaignName(''); 
      setRecipientsManual(''); 
      setRecipientFile(null); 
      setMessage(''); 
      setSelectedTemplate(''); 
      setScheduleDateTime(''); 
      setSenderId('');
      // setSelectedGateway(''); // Or reset to default
    }, 2000);
  };

  const checkDeliverability = useCallback(async () => {
    if (!message || !smsSettings.senderId) return;
    
    try {
      const response = await fetch('/api/check-sms-deliverability', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message,
          senderId: smsSettings.senderId,
          useUnicode: smsSettings.useUnicode,
          concatenate: smsSettings.concatenate,
        }),
      });
      
      const data = await response.json();
      setDeliverabilityChecks(data);
    } catch (error) {
      console.error('Error checking deliverability:', error);
    }
  }, [message, smsSettings.senderId, smsSettings.useUnicode, smsSettings.concatenate]);

  useEffect(() => {
    const debounceTimer = setTimeout(checkDeliverability, 1000);
    return () => clearTimeout(debounceTimer);
  }, [checkDeliverability]);

  return (
    <div className="bg-secondary p-4 sm:p-6 rounded-lg shadow-xl min-h-full">
      <div className="flex items-center justify-between mb-6 border-b-2 border-accent pb-3">
        <h1 className="text-3xl font-bold text-text-primary flex items-center">
          <PageIcon className="w-8 h-8 mr-3 text-accent"/> Bulk SMS Sender
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
            : formMessage.toLowerCase().includes("ai is generating") || isLoadingMessage 
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
                placeholder="e.g., Product Launch SMS"
                required
                className="bg-slate-800/50"
              />
              <Select
                label="SMS Gateway"
                id="selectedGateway"
                name="selectedGateway"
                options={predefinedSmsGateways}
                value={selectedGateway}
                onChange={(e) => setSelectedGateway(e.target.value)}
                required
                className="bg-slate-800/50"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Textarea
                label="Recipients (Phone per line or comma-separated)"
                id="recipientsManual"
                name="recipientsManual"
                value={recipientsManual}
                onChange={(e) => setRecipientsManual(e.target.value)}
                placeholder="+1234567890, +0987654321\n+1122334455"
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
                <label htmlFor="message" className="block text-sm font-medium text-text-primary">
                  SMS Message
                </label>
                <div className="flex items-center space-x-2">
                  <span className="text-xs text-text-secondary">
                    {message.length}/160 characters
                  </span>
                  {isAiAvailable() && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={handleSuggestMessage}
                      isLoading={isLoadingMessage}
                      disabled={isLoadingMessage}
                      leftIcon={<SparklesIcon className="w-4 h-4" />}
                      className="text-xs !py-0.5 text-accent hover:text-accent-light"
                    >
                      {isLoadingMessage ? "Generating..." : "Generate with AI"}
                    </Button>
                  )}
                </div>
              </div>
              <Textarea
                id="message"
                name="message"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Enter your SMS message here..."
                rows={4}
                required
                maxLength={160}
                className="bg-slate-800/50"
              />
            </div>

            <div className="space-y-6 border-t border-slate-700 pt-6">
              <h3 className="text-lg font-semibold text-text-primary">Advanced Settings</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <Input
                    label="Sender ID (Alphanumeric)"
                    id="senderId"
                    name="senderId"
                    value={smsSettings.senderId}
                    onChange={(e) => setSmsSettings(prev => ({ ...prev, senderId: e.target.value }))}
                    placeholder="Your Company Name"
                    maxLength={11}
                    className="bg-slate-800/50"
                  />
                  <p className="text-xs text-text-secondary mt-1">Max 11 characters, alphanumeric only</p>
                </div>
                
                <div>
                  <Input
                    label="Schedule Time (Optional)"
                    id="scheduleTime"
                    name="scheduleTime"
                    type="datetime-local"
                    value={smsSettings.scheduleTime}
                    onChange={(e) => setSmsSettings(prev => ({ ...prev, scheduleTime: e.target.value }))}
                    className="bg-slate-800/50"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
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
                    value={smsSettings.priority}
                    onChange={(e) => setSmsSettings(prev => ({ ...prev, priority: e.target.value }))}
                    className="bg-slate-800/50"
                  />
                </div>
                
                <div>
                  <Input
                    label="Batch Size"
                    id="batchSize"
                    name="batchSize"
                    type="number"
                    value={smsSettings.batchSize}
                    onChange={(e) => setSmsSettings(prev => ({ ...prev, batchSize: parseInt(e.target.value) }))}
                    min="1"
                    max="100"
                    className="bg-slate-800/50"
                  />
                  <p className="text-xs text-text-secondary mt-1">SMS per batch</p>
                </div>
                
                <div>
                  <Input
                    label="Delay Between Batches (minutes)"
                    id="delayBetweenBatches"
                    name="delayBetweenBatches"
                    type="number"
                    value={smsSettings.delayBetweenBatches}
                    onChange={(e) => setSmsSettings(prev => ({ ...prev, delayBetweenBatches: parseInt(e.target.value) }))}
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
                      checked={smsSettings.useUnicode}
                      onChange={(e) => setSmsSettings(prev => ({ ...prev, useUnicode: e.target.checked }))}
                      className="form-checkbox h-4 w-4 text-accent"
                    />
                    <span className="text-sm text-text-primary">Use Unicode</span>
                  </label>
                  
                  <label className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={smsSettings.concatenate}
                      onChange={(e) => setSmsSettings(prev => ({ ...prev, concatenate: e.target.checked }))}
                      className="form-checkbox h-4 w-4 text-accent"
                    />
                    <span className="text-sm text-text-primary">Concatenate Long Messages</span>
                  </label>
                  
                  <label className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={smsSettings.flashMessage}
                      onChange={(e) => setSmsSettings(prev => ({ ...prev, flashMessage: e.target.checked }))}
                      className="form-checkbox h-4 w-4 text-accent"
                    />
                    <span className="text-sm text-text-primary">Flash Message</span>
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
                className="bg-accent hover:bg-accent-light"
              >
                Queue Campaign
              </Button>
            </div>
          </form>

          {/* Campaigns Log */}
          <div className="bg-primary p-6 rounded-lg shadow-2xl border border-slate-700">
            <h2 className="text-2xl font-semibold text-text-primary mb-4">SMS Campaigns Log</h2>
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
                            if(auth.user) auth.logUserActivity(auth.user.id, `Viewed details for SMS campaign: ${campaign.name}`);
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
          <h2 className="text-xl font-semibold text-text-primary mb-3">Message Preview</h2>
          <div className="relative">
            <div className="w-full min-h-[200px] border border-slate-600 rounded bg-slate-800/50 p-4">
              <div className="text-text-primary whitespace-pre-wrap">
                {message || "Your message will appear here..."}
              </div>
              <div className="absolute bottom-2 right-2 text-xs text-text-secondary">
                {message.length}/160 characters
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
                {predefinedSmsTemplates.map((template, index) => (
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
                <li>• Keep messages under 160 characters to avoid splitting</li>
                <li>• Include a clear call-to-action</li>
                <li>• Use AI generation for engaging content</li>
                <li>• Test your message before sending</li>
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
                    <span className="text-xs text-text-secondary block mb-1">Carrier Status</span>
                    <span className={`text-sm ${
                      deliverabilityChecks.carrierStatus === 'valid' ? 'text-green-400' :
                      deliverabilityChecks.carrierStatus === 'pending' ? 'text-yellow-400' :
                      'text-red-400'
                    }`}>
                      {deliverabilityChecks.carrierStatus}
                    </span>
                  </div>
                  
                  <div className="p-3 bg-slate-800/50 rounded-lg">
                    <span className="text-xs text-text-secondary block mb-1">Number Format</span>
                    <span className={`text-sm ${
                      deliverabilityChecks.numberFormat === 'valid' ? 'text-green-400' :
                      deliverabilityChecks.numberFormat === 'pending' ? 'text-yellow-400' :
                      'text-red-400'
                    }`}>
                      {deliverabilityChecks.numberFormat}
                    </span>
                  </div>
                  
                  <div className="p-3 bg-slate-800/50 rounded-lg">
                    <span className="text-xs text-text-secondary block mb-1">Gateway Status</span>
                    <span className={`text-sm ${
                      deliverabilityChecks.gatewayStatus === 'valid' ? 'text-green-400' :
                      deliverabilityChecks.gatewayStatus === 'pending' ? 'text-yellow-400' :
                      'text-red-400'
                    }`}>
                      {deliverabilityChecks.gatewayStatus}
                    </span>
                  </div>
                  
                  <div className="p-3 bg-slate-800/50 rounded-lg">
                    <span className="text-xs text-text-secondary block mb-1">Route Status</span>
                    <span className={`text-sm ${
                      deliverabilityChecks.routeStatus === 'valid' ? 'text-green-400' :
                      deliverabilityChecks.routeStatus === 'pending' ? 'text-yellow-400' :
                      'text-red-400'
                    }`}>
                      {deliverabilityChecks.routeStatus}
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
                    Keep messages under 160 characters for single SMS
                  </span>
                </li>
                <li className="flex items-start">
                  <CheckCircleIcon className="w-5 h-5 text-green-400 mr-2 flex-shrink-0 mt-0.5" />
                  <span className="text-sm text-text-secondary">
                    Use a consistent sender ID for better recognition
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
                    Test your message across different carriers
                  </span>
                </li>
                <li className="flex items-start">
                  <CheckCircleIcon className="w-5 h-5 text-green-400 mr-2 flex-shrink-0 mt-0.5" />
                  <span className="text-sm text-text-secondary">
                    Warm up your sender ID gradually
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

export default BulkSmsPage;
