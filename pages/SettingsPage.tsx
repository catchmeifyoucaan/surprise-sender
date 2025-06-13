import React, { useState, useEffect, ChangeEvent } from 'react';
import { useAuth } from '../context/AuthContext';
import { Input, Button, Select, Modal, Tabs, Badge, FileUpload } from '../components/common';
import SmtpTab from './settings/SmtpTab';
import { toast } from 'react-hot-toast';
import {
  Cog6ToothIcon,
  KeyIcon,
  UserIcon,
  BellIcon,
  ShieldCheckIcon,
  ServerIcon,
  ArrowPathIcon,
  TrashIcon,
  PlusIcon,
  DocumentTextIcon
} from '@heroicons/react/24/outline';
import SmtpValidator from '../components/SmtpValidator';

function getJwtToken() {
  return localStorage.getItem('surpriseSenderUser');
}

const fetchWithAuth = async (url: string, options: any = {}) => {
  const token = getJwtToken();
  options.headers = options.headers || {};
  if (token) options.headers['Authorization'] = `Bearer ${token}`;
  
  // Use the backend server URL
  const baseUrl = 'http://localhost:3001';
  const response = await fetch(`${baseUrl}${url}`, options);
  
  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Failed to fetch data' }));
    throw new Error(error.error || 'Failed to fetch data');
  }
  
  return response;
};

interface SmtpConfig {
  id: string;
  userId: string;
  name: string;
  host: string;
  port: number;
  username: string;
  password: string;
  secure: boolean;
  isActive: boolean;
  lastChecked?: string;
  lastValidated?: string;
  lastUsed?: string;
  createdAt: string;
  updatedAt: string;
  maxEmailsPerDay: number;
  currentEmailsSent: number;
  status: 'active' | 'inactive' | 'error';
  providerType: 'smtp' | 'webmail' | 'api';
  webmailProvider?: string;
  apiProvider?: string;
  apiKey?: string;
  region?: string;
  fromEmail?: string;
  fromName?: string;
  isValid: boolean;
  lastError?: string;
  security?: {
    ssl: boolean;
    tls: boolean;
    starttls: boolean;
  };
  stats?: {
    daily: number;
    monthly: number;
    total: number;
  };
  limits?: {
    daily: number;
    monthly: number;
    concurrent: number;
    maxFileSize: number;
    allowedFileTypes: string[];
  };
}

interface UserPreferences {
  theme: 'light' | 'dark' | 'system';
  notifications: {
    email: boolean;
    sms: boolean;
    desktop: boolean;
  };
  timezone: string;
  language: string;
}

interface SecuritySettings {
  twoFactorEnabled: boolean;
  sessionTimeout: number;
  passwordExpiry: number;
  loginAttempts: number;
}

const providerTypes = [
  { value: 'smtp', label: 'SMTP' },
  { value: 'webmail', label: 'Webmail (Gmail, Outlook, Hotmail, Yahoo, Hostinger, etc.)' },
  { value: 'api', label: 'API (Mailgun, Amazon SES, SendGrid, etc.)' }
];

const webmailProviders = [
  { value: 'gmail', label: 'Gmail' },
  { value: 'outlook', label: 'Outlook' },
  { value: 'hotmail', label: 'Hotmail' },
  { value: 'yahoo', label: 'Yahoo' },
  { value: 'hostinger', label: 'Hostinger' }
];

const apiProviders = [
  { value: 'mailgun', label: 'Mailgun' },
  { value: 'amazon-ses', label: 'Amazon SES' },
  { value: 'sendgrid', label: 'SendGrid' }
];

const SettingsPage: React.FC = () => {
  const auth = useAuth();
  const [activeTab, setActiveTab] = useState<'smtp' | 'preferences' | 'security' | 'api'>('smtp');
  const [smtpConfigs, setSmtpConfigs] = useState<SmtpConfig[]>([]);
  const [preferences, setPreferences] = useState<UserPreferences>({
    theme: 'dark',
    notifications: {
      email: true,
      sms: true,
      desktop: true
    },
    timezone: 'UTC',
    language: 'en'
  });
  const [security, setSecurity] = useState<SecuritySettings>({
    twoFactorEnabled: false,
    sessionTimeout: 30,
    passwordExpiry: 90,
    loginAttempts: 5
  });
  const [apiKey, setApiKey] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isValidating, setIsValidating] = useState<string | null>(null);
  const [showAddSmtpModal, setShowAddSmtpModal] = useState(false);
  const [newSmtp, setNewSmtp] = useState<Partial<SmtpConfig>>({
    host: '',
    port: 587,
    username: '',
    password: '',
    secure: false,
    isActive: true,
    providerType: 'smtp',
    name: '',
    userId: auth.user?.id || '',
    maxEmailsPerDay: 1000,
    currentEmailsSent: 0,
    status: 'inactive'
  });
  const [uploadTab, setUploadTab] = useState<'single' | 'bulk'>('single');
  const [bulkFile, setBulkFile] = useState<File | null>(null);
  const [fileName, setFileName] = useState<string>('');
  const [importFormat, setImportFormat] = useState<'auto' | 'csv' | 'txt' | 'excel' | 'api-keys'>('auto');
  const [delimiter, setDelimiter] = useState<string>('auto');
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [uploadResults, setUploadResults] = useState<{
    total: number;
    success: number;
    failed: number;
    errors: string[];
    configs: SmtpConfig[];
  } | null>(null);
  const [showUploadResults, setShowUploadResults] = useState<boolean>(false);
  const [settingsError, setSettingsError] = useState<string | null>(null);
  const [validConfigs, setValidConfigs] = useState<SmtpConfig[]>([]);
  const [invalidConfigs, setInvalidConfigs] = useState<{ config: SmtpConfig; error: string }[]>([]);
  const [useAllSmtps, setUseAllSmtps] = useState(false);
  const [selectedSmtpIds, setSelectedSmtpIds] = useState<string[]>([]);

  useEffect(() => {
    if (!auth.isLoading && auth.user) {
      auth.logUserActivity(auth.user.id, 'Viewed Settings Page.');
      fetchSettings();
    }
    // Only run when auth.isLoading or auth.user changes
  }, [auth.isLoading, auth.user]);

  const fetchSettings = async () => {
    setIsLoading(true);
    try {
      const [smtpResponse, prefsResponse, securityResponse] = await Promise.all([
        fetchWithAuth('/api/settings/smtp'),
        fetchWithAuth('/api/settings/preferences'),
        fetchWithAuth('/api/settings/security')
      ]);

      if (!smtpResponse.ok || !prefsResponse.ok || !securityResponse.ok) {
        throw new Error('Failed to fetch settings');
      }

      const [smtpData, prefsData, securityData] = await Promise.all([
        smtpResponse.json(),
        prefsResponse.json(),
        securityResponse.json()
      ]);

      setSmtpConfigs(smtpData);
      setPreferences(prefsData);
      setSecurity(securityData);
    } catch (error) {
      toast.error('Failed to load settings');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSmtpAdd = async (config: Partial<SmtpConfig>) => {
    try {
      const smtpConfig: Omit<SmtpConfig, 'id' | 'lastChecked'> = {
        userId: auth.user?.id || '',
        name: config.name || config.host || '',
        host: config.host || '',
        port: config.port || 587,
        username: config.username || '',
        password: config.password || '',
        secure: config.secure || false,
        isActive: config.isActive || false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        maxEmailsPerDay: config.maxEmailsPerDay || 1000,
        currentEmailsSent: 0,
        lastUsed: new Date().toISOString(),
        status: 'inactive',
        providerType: config.providerType || 'smtp',
        webmailProvider: config.webmailProvider,
        apiProvider: config.apiProvider,
        apiKey: config.apiKey,
        region: config.region,
        fromEmail: config.fromEmail,
        fromName: config.fromName,
        isValid: false,
        security: {
          ssl: config.secure || false,
          tls: config.secure || false,
          starttls: !config.secure
        }
      };

      const response = await fetchWithAuth('/api/settings/smtp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(smtpConfig)
      });

      if (!response.ok) throw new Error('Failed to add SMTP configuration');

      toast.success('SMTP configuration added successfully');
      fetchSettings();
    } catch (error) {
      toast.error('Failed to add SMTP configuration');
    }
  };

  const handleSmtpUpdate = async (id: string, updates: Partial<SmtpConfig>) => {
    try {
      const response = await fetchWithAuth(`/api/settings/smtp/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      });

      if (!response.ok) throw new Error('Failed to update SMTP configuration');

      toast.success('SMTP configuration updated successfully');
      fetchSettings();
    } catch (error) {
      toast.error('Failed to update SMTP configuration');
    }
  };

  const handleSmtpDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this SMTP configuration?')) return;

    try {
      const response = await fetchWithAuth(`/api/settings/smtp/${id}`, {
        method: 'DELETE'
      });

      if (!response.ok) throw new Error('Failed to delete SMTP configuration');

      toast.success('SMTP configuration deleted successfully');
      fetchSettings();
    } catch (error) {
      toast.error('Failed to delete SMTP configuration');
    }
  };

  const handleSmtpValidate = async (id: string) => {
    setIsValidating(id);
    try {
      const response = await fetchWithAuth(`/api/settings/smtp/${id}/validate`, {
        method: 'POST'
      });

      if (!response.ok) throw new Error('Failed to validate SMTP configuration');

      toast.success('SMTP configuration validated successfully');
      fetchSettings();
    } catch (error) {
      toast.error('Failed to validate SMTP configuration');
    } finally {
      setIsValidating(null);
    }
  };

  const handlePreferencesUpdate = async (updates: Partial<UserPreferences>) => {
    try {
      const response = await fetchWithAuth('/api/settings/preferences', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      });

      if (!response.ok) throw new Error('Failed to update preferences');

      toast.success('Preferences updated successfully');
      setPreferences({ ...preferences, ...updates });
    } catch (error) {
      toast.error('Failed to update preferences');
    }
  };

  const handleSecurityUpdate = async (updates: Partial<SecuritySettings>) => {
    try {
      const response = await fetchWithAuth('/api/settings/security', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      });

      if (!response.ok) throw new Error('Failed to update security settings');

      toast.success('Security settings updated successfully');
      setSecurity({ ...security, ...updates });
    } catch (error) {
      toast.error('Failed to update security settings');
    }
  };

  const handleApiKeyUpdate = async () => {
    try {
      const response = await fetchWithAuth('/api/settings/api-key', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKey })
      });

      if (!response.ok) throw new Error('Failed to update API key');

      toast.success('API key updated successfully');
      setApiKey('');
    } catch (error) {
      toast.error('Failed to update API key');
    }
  };

  const handleFileSelect = (file: File) => {
    setBulkFile(file);
    setFileName(file.name);
  };

  const handleBulkUpload = async () => {
    if (!bulkFile) {
      toast.error('Please select a file first');
      return;
    }

    // Check file size (5MB limit)
    if (bulkFile.size > 5 * 1024 * 1024) {
      toast.error('File too large. Maximum size is 5MB');
      return;
    }

    try {
      setIsUploading(true);
      setUploadProgress(0);
      setUploadResults(null);

      // Create form data
      const formData = new FormData();
      formData.append('file', bulkFile);

      // Get the auth token
      const token = getJwtToken();
      if (!token) {
        throw new Error('Not authenticated');
      }

      // Upload file using fetchWithAuth
      const response = await fetchWithAuth('/api/settings/smtp/import', {
        method: 'POST',
        body: formData,
        // Don't set Content-Type header - let the browser set it with the boundary
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.details || errorData.error || 'Failed to upload SMTP configurations');
      }

      const data = await response.json();
      
      // Validate response format
      if (!data || typeof data !== 'object' || !('total' in data) || !('success' in data) || !('failed' in data)) {
        throw new Error('Invalid response format from server');
      }

      // Update state with results
      setUploadResults({
        total: data.total,
        success: data.success,
        failed: data.failed,
        errors: data.errors || [],
        configs: data.configs || []
      });

      // Show success/error message
      if (data.success > 0) {
        toast.success(`Successfully imported ${data.success} SMTP configurations`);
      }
      if (data.failed > 0) {
        toast.error(`Failed to import ${data.failed} configurations`);
      }

      // Show upload results
      setShowUploadResults(true);

      // Refresh SMTP list
      fetchSettings();
    } catch (error) {
      console.error('Upload error:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to upload SMTP configurations');
    } finally {
      setIsUploading(false);
      setUploadProgress(100);
    }
  };

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-2xl font-bold text-text-primary flex items-center">
            <Cog6ToothIcon className="w-8 h-8 mr-3 text-accent" />
            Settings
          </h1>
          <Button
            variant="secondary"
            onClick={fetchSettings}
            disabled={isLoading}
          >
            <ArrowPathIcon className="w-5 h-5 mr-2" />
            Refresh
          </Button>
        </div>

        <div className="grid grid-cols-12 gap-6">
          {/* Sidebar Navigation */}
          <div className="col-span-3">
            <div className="bg-primary rounded-lg shadow-lg p-4">
              <nav className="space-y-2">
                <button
                  onClick={() => setActiveTab('smtp')}
                  className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors ${
                    activeTab === 'smtp' 
                      ? 'bg-accent text-white' 
                      : 'text-text-secondary hover:bg-slate-700'
                  }`}
                >
                  <ServerIcon className="w-5 h-5" />
                  <span>SMTP Configuration</span>
                </button>
                <button
                  onClick={() => setActiveTab('preferences')}
                  className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors ${
                    activeTab === 'preferences' 
                      ? 'bg-accent text-white' 
                      : 'text-text-secondary hover:bg-slate-700'
                  }`}
                >
                  <UserIcon className="w-5 h-5" />
                  <span>User Preferences</span>
                </button>
                <button
                  onClick={() => setActiveTab('security')}
                  className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors ${
                    activeTab === 'security' 
                      ? 'bg-accent text-white' 
                      : 'text-text-secondary hover:bg-slate-700'
                  }`}
                >
                  <ShieldCheckIcon className="w-5 h-5" />
                  <span>Security</span>
                </button>
                <button
                  onClick={() => setActiveTab('api')}
                  className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors ${
                    activeTab === 'api' 
                      ? 'bg-accent text-white' 
                      : 'text-text-secondary hover:bg-slate-700'
                  }`}
                >
                  <KeyIcon className="w-5 h-5" />
                  <span>API Settings</span>
                </button>
              </nav>
            </div>
          </div>

          {/* Main Content */}
          <div className="col-span-9">
            <div className="bg-primary rounded-lg shadow-lg p-6">
              {/* SMTP Configuration */}
              {activeTab === 'smtp' && (
                <div className="space-y-6">
                  <div className="flex justify-between items-center">
                    <h2 className="text-xl font-semibold text-text-primary">
                      SMTP Configuration
                    </h2>
                    <Button
                      onClick={() => setShowAddSmtpModal(true)}
                      className="flex items-center"
                    >
                      <PlusIcon className="w-5 h-5 mr-2" />
                      Add SMTP
                    </Button>
                  </div>

                  {/* SMTP List */}
                  <div className="space-y-4">
                    {smtpConfigs.map((config) => (
                      <div key={config.id} className="bg-slate-800/50 rounded-lg p-4 border border-slate-700">
                        <div className="flex justify-between items-start">
                          <div>
                            <h3 className="text-lg font-medium text-text-primary">{config.name || config.host}</h3>
                            <p className="text-text-secondary">Type: {config.providerType}</p>
                            {config.providerType === 'smtp' && (
                              <>
                                <p className="text-text-secondary">Host: {config.host}</p>
                                <p className="text-text-secondary">Port: {config.port}</p>
                                <p className="text-text-secondary">User: {config.username}</p>
                              </>
                            )}
                            {config.providerType === 'webmail' && (
                              <p className="text-text-secondary">Provider: {config.webmailProvider}</p>
                            )}
                            {config.providerType === 'api' && (
                              <>
                                <p className="text-text-secondary">Provider: {config.apiProvider}</p>
                                <p className="text-text-secondary">Region: {config.region}</p>
                              </>
                            )}
                          </div>
                          <div className="flex space-x-2">
                            <Button
                              variant="secondary"
                              onClick={() => handleSmtpValidate(config.id)}
                              disabled={isValidating === config.id}
                            >
                              <ArrowPathIcon className="w-5 h-5 mr-2" />
                              {isValidating === config.id ? 'Validating...' : 'Validate'}
                            </Button>
                            <Button
                              variant="danger"
                              onClick={() => handleSmtpDelete(config.id)}
                            >
                              <TrashIcon className="w-5 h-5" />
                            </Button>
                          </div>
                        </div>
                        <div className="mt-2">
                          <Badge
                            variant={config.isActive ? 'success' : 'danger'}
                          >
                            {config.isActive ? 'Active' : 'Inactive'}
                          </Badge>
                          {config.lastChecked && (
                            <span className="text-text-secondary text-sm ml-2">
                              Last checked: {new Date(config.lastChecked).toLocaleString()}
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Import Section */}
                  <div className="mt-8">
                    <h3 className="text-lg font-medium text-text-primary mb-4">Import SMTP Configurations</h3>
                    <Tabs
                      activeTab={uploadTab}
                      onChange={(tabId) => setUploadTab(tabId as 'single' | 'bulk')}
                      tabs={[
                        { id: 'single', label: 'Single Import', content: null },
                        { id: 'bulk', label: 'Bulk Import', content: null }
                      ]}
                    />

                    {uploadTab === 'single' && (
                      <div className="mt-4">
                        <form onSubmit={(e) => {
                          e.preventDefault();
                          handleSmtpAdd(newSmtp as Partial<SmtpConfig>);
                          setShowAddSmtpModal(false);
                        }}>
                          <div className="space-y-4">
                            <Select
                              label="Provider Type"
                              value={newSmtp.providerType || 'smtp'}
                              onChange={(e) => setNewSmtp({ ...newSmtp, providerType: e.target.value as 'smtp' | 'webmail' | 'api' })}
                              options={providerTypes}
                            />
                            
                            {newSmtp.providerType === 'smtp' && (
                              <>
                                <div className="form-group">
                                  <label htmlFor="smtp-host" className="block text-sm font-medium text-text-secondary mb-2">
                                    Host
                                  </label>
                                  <Input
                                    id="smtp-host"
                                    value={newSmtp.host}
                                    onChange={(e) => setNewSmtp({ ...newSmtp, host: e.target.value })}
                                    required
                                  />
                                </div>
                                <div className="form-group">
                                  <label htmlFor="smtp-port" className="block text-sm font-medium text-text-secondary mb-2">
                                    Port
                                  </label>
                                  <Input
                                    id="smtp-port"
                                    type="number"
                                    value={newSmtp.port}
                                    onChange={(e) => setNewSmtp({ ...newSmtp, port: parseInt(e.target.value) })}
                                    required
                                  />
                                </div>
                                <div className="form-group">
                                  <label htmlFor="smtp-username" className="block text-sm font-medium text-text-secondary mb-2">
                                    Username
                                  </label>
                                  <Input
                                    id="smtp-username"
                                    value={newSmtp.username}
                                    onChange={(e) => setNewSmtp({ ...newSmtp, username: e.target.value })}
                                    required
                                  />
                                </div>
                                <div className="form-group">
                                  <label htmlFor="smtp-password" className="block text-sm font-medium text-text-secondary mb-2">
                                    Password
                                  </label>
                                  <Input
                                    id="smtp-password"
                                    type="password"
                                    value={newSmtp.password}
                                    onChange={(e) => setNewSmtp({ ...newSmtp, password: e.target.value })}
                                    required
                                  />
                                </div>
                              </>
                            )}

                            {newSmtp.providerType === 'webmail' && (
                              <>
                                <div className="form-group">
                                  <label htmlFor="webmail-provider" className="block text-sm font-medium text-text-secondary mb-2">
                                    Webmail Provider
                                  </label>
                                  <Select
                                    id="webmail-provider"
                                    value={newSmtp.webmailProvider || ''}
                                    onChange={(e) => setNewSmtp({ ...newSmtp, webmailProvider: e.target.value })}
                                    options={webmailProviders}
                                    required
                                  />
                                </div>
                                <div className="form-group">
                                  <label htmlFor="webmail-email" className="block text-sm font-medium text-text-secondary mb-2">
                                    Email
                                  </label>
                                  <Input
                                    id="webmail-email"
                                    type="email"
                                    value={newSmtp.username}
                                    onChange={(e) => setNewSmtp({ ...newSmtp, username: e.target.value })}
                                    required
                                  />
                                </div>
                                <div className="form-group">
                                  <label htmlFor="webmail-password" className="block text-sm font-medium text-text-secondary mb-2">
                                    Password
                                  </label>
                                  <Input
                                    id="webmail-password"
                                    type="password"
                                    value={newSmtp.password}
                                    onChange={(e) => setNewSmtp({ ...newSmtp, password: e.target.value })}
                                    required
                                  />
                                </div>
                              </>
                            )}

                            {newSmtp.providerType === 'api' && (
                              <>
                                <div className="form-group">
                                  <label htmlFor="api-provider" className="block text-sm font-medium text-text-secondary mb-2">
                                    API Provider
                                  </label>
                                  <Select
                                    id="api-provider"
                                    value={newSmtp.apiProvider || ''}
                                    onChange={(e) => setNewSmtp({ ...newSmtp, apiProvider: e.target.value })}
                                    options={apiProviders}
                                    required
                                  />
                                </div>
                                <div className="form-group">
                                  <label htmlFor="api-key" className="block text-sm font-medium text-text-secondary mb-2">
                                    API Key
                                  </label>
                                  <Input
                                    id="api-key"
                                    value={newSmtp.apiKey}
                                    onChange={(e) => setNewSmtp({ ...newSmtp, apiKey: e.target.value })}
                                    required
                                  />
                                </div>
                                <div className="form-group">
                                  <label htmlFor="api-region" className="block text-sm font-medium text-text-secondary mb-2">
                                    Region
                                  </label>
                                  <Input
                                    id="api-region"
                                    value={newSmtp.region}
                                    onChange={(e) => setNewSmtp({ ...newSmtp, region: e.target.value })}
                                    required
                                  />
                                </div>
                                <div className="form-group">
                                  <label htmlFor="api-from-email" className="block text-sm font-medium text-text-secondary mb-2">
                                    From Email
                                  </label>
                                  <Input
                                    id="api-from-email"
                                    type="email"
                                    value={newSmtp.fromEmail}
                                    onChange={(e) => setNewSmtp({ ...newSmtp, fromEmail: e.target.value })}
                                    required
                                  />
                                </div>
                                <div className="form-group">
                                  <label htmlFor="api-from-name" className="block text-sm font-medium text-text-secondary mb-2">
                                    From Name
                                  </label>
                                  <Input
                                    id="api-from-name"
                                    value={newSmtp.fromName}
                                    onChange={(e) => setNewSmtp({ ...newSmtp, fromName: e.target.value })}
                                    required
                                  />
                                </div>
                              </>
                            )}

                            <div className="form-group">
                              <label htmlFor="smtp-secure" className="flex items-center space-x-2">
                                <input
                                  id="smtp-secure"
                                  type="checkbox"
                                  checked={newSmtp.secure}
                                  onChange={(e) => setNewSmtp({ ...newSmtp, secure: e.target.checked })}
                                  className="rounded border-slate-700 text-accent focus:ring-accent"
                                />
                                <span className="text-text-primary">Use SSL/TLS</span>
                              </label>
                            </div>
                            <Button type="submit">Add SMTP</Button>
                          </div>
                        </form>
                      </div>
                    )}

                    {uploadTab === 'bulk' && (
                      <div className="mt-4">
                        <div className="space-y-4">
                          <div>
                            <FileUpload
                              accept=".csv,.txt,.xlsx"
                              onChange={handleFileSelect}
                              onError={(error) => {
                                console.error('File upload error:', error);
                                toast.error(error);
                              }}
                            />
                            {fileName && (
                              <div className="mt-2 flex items-center space-x-2">
                                <DocumentTextIcon className="w-5 h-5 text-text-secondary" />
                                <span className="text-text-secondary">{fileName}</span>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setBulkFile(null);
                                    setFileName('');
                                  }}
                                  className="text-red-400 hover:text-red-300"
                                >
                                  <TrashIcon className="w-4 h-4" />
                                </button>
                              </div>
                            )}
                            <p className="mt-1 text-sm text-text-secondary">
                              Supported formats: CSV, TXT, Excel (.xlsx, .xls)
                            </p>
                            <p className="text-sm text-text-secondary">
                              Maximum file size: 500KB
                            </p>
                          </div>
                          <Select
                            label="Import Format"
                            value={importFormat}
                            onChange={(e) => setImportFormat(e.target.value as 'auto' | 'csv' | 'txt' | 'excel' | 'api-keys')}
                            options={[
                              { value: 'auto', label: 'Auto Detect' },
                              { value: 'csv', label: 'CSV' },
                              { value: 'txt', label: 'Text' },
                              { value: 'excel', label: 'Excel' },
                              { value: 'api-keys', label: 'API Keys' }
                            ]}
                          />
                          <Select
                            label="Delimiter"
                            value={delimiter}
                            onChange={(e) => setDelimiter(e.target.value)}
                            options={[
                              { value: 'auto', label: 'Auto Detect' },
                              { value: ',', label: 'Comma (,)' },
                              { value: ';', label: 'Semicolon (;)' },
                              { value: '\t', label: 'Tab' }
                            ]}
                          />
                          <Button
                            onClick={handleBulkUpload}
                            disabled={!bulkFile || isUploading}
                            className="w-full"
                          >
                            {isUploading ? (
                              <div className="flex items-center justify-center">
                                <ArrowPathIcon className="w-5 h-5 mr-2 animate-spin" />
                                Uploading...
                              </div>
                            ) : (
                              'Upload'
                            )}
                          </Button>
                        </div>

                        {isUploading && (
                          <div className="mt-4">
                            <div className="w-full bg-slate-700 rounded-full h-2.5">
                              <div
                                className="bg-accent h-2.5 rounded-full transition-all duration-300"
                                style={{ width: `${uploadProgress}%` }}
                              ></div>
                            </div>
                            <p className="text-sm text-text-secondary text-center mt-2">
                              {uploadProgress < 100 ? 'Uploading and validating SMTPs...' : 'Complete'}
                            </p>
                          </div>
                        )}

                        {showUploadResults && uploadResults && (
                          <div className="mt-4 bg-slate-800/50 rounded-lg p-4 border border-slate-700">
                            <h4 className="text-lg font-medium text-text-primary mb-2">Upload Results</h4>
                            <div className="grid grid-cols-3 gap-4 mb-4">
                              <div className="text-center">
                                <p className="text-text-secondary">Total</p>
                                <p className="text-xl font-semibold">{uploadResults.total}</p>
                              </div>
                              <div className="text-center">
                                <p className="text-text-secondary">Valid</p>
                                <p className="text-xl font-semibold text-green-500">{uploadResults.success}</p>
                              </div>
                              <div className="text-center">
                                <p className="text-text-secondary">Invalid</p>
                                <p className="text-xl font-semibold text-red-500">{uploadResults.failed}</p>
                              </div>
                            </div>
                            {uploadResults.errors && uploadResults.errors.length > 0 && (
                              <div className="mt-4">
                                <p className="text-text-secondary font-medium mb-2">Errors:</p>
                                <div className="max-h-40 overflow-y-auto">
                                  <ul className="list-disc list-inside text-red-500 space-y-1">
                                    {uploadResults.errors.map((error, index) => (
                                      <li key={index} className="text-sm">{error}</li>
                                    ))}
                                  </ul>
                                </div>
                              </div>
                            )}
                            {uploadResults.configs && uploadResults.configs.length > 0 && (
                              <div className="mt-4 p-3 bg-green-500/10 rounded-lg border border-green-500/20">
                                <p className="text-green-500">
                                  Successfully imported {uploadResults.configs.length} SMTP configurations.
                                </p>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Add SMTP Modal */}
                  <Modal
                    isOpen={showAddSmtpModal}
                    onClose={() => setShowAddSmtpModal(false)}
                    title="Add SMTP Configuration"
                  >
                    <form onSubmit={(e) => {
                      e.preventDefault();
                      handleSmtpAdd(newSmtp as Partial<SmtpConfig>);
                      setShowAddSmtpModal(false);
                    }}>
                      <div className="space-y-4">
                        <Select
                          label="Provider Type"
                          value={newSmtp.providerType || 'smtp'}
                          onChange={(e) => setNewSmtp({ ...newSmtp, providerType: e.target.value as 'smtp' | 'webmail' | 'api' })}
                          options={providerTypes}
                        />
                        
                        {newSmtp.providerType === 'smtp' && (
                          <>
                            <div className="form-group">
                              <label htmlFor="smtp-host" className="block text-sm font-medium text-text-secondary mb-2">
                                Host
                              </label>
                              <Input
                                id="smtp-host"
                                value={newSmtp.host}
                                onChange={(e) => setNewSmtp({ ...newSmtp, host: e.target.value })}
                                required
                              />
                            </div>
                            <div className="form-group">
                              <label htmlFor="smtp-port" className="block text-sm font-medium text-text-secondary mb-2">
                                Port
                              </label>
                              <Input
                                id="smtp-port"
                                type="number"
                                value={newSmtp.port}
                                onChange={(e) => setNewSmtp({ ...newSmtp, port: parseInt(e.target.value) })}
                                required
                              />
                            </div>
                            <div className="form-group">
                              <label htmlFor="smtp-username" className="block text-sm font-medium text-text-secondary mb-2">
                                Username
                              </label>
                              <Input
                                id="smtp-username"
                                value={newSmtp.username}
                                onChange={(e) => setNewSmtp({ ...newSmtp, username: e.target.value })}
                                required
                              />
                            </div>
                            <div className="form-group">
                              <label htmlFor="smtp-password" className="block text-sm font-medium text-text-secondary mb-2">
                                Password
                              </label>
                              <Input
                                id="smtp-password"
                                type="password"
                                value={newSmtp.password}
                                onChange={(e) => setNewSmtp({ ...newSmtp, password: e.target.value })}
                                required
                              />
                            </div>
                          </>
                        )}

                        {newSmtp.providerType === 'webmail' && (
                          <>
                            <div className="form-group">
                              <label htmlFor="webmail-provider" className="block text-sm font-medium text-text-secondary mb-2">
                                Webmail Provider
                              </label>
                              <Select
                                id="webmail-provider"
                                value={newSmtp.webmailProvider || ''}
                                onChange={(e) => setNewSmtp({ ...newSmtp, webmailProvider: e.target.value })}
                                options={webmailProviders}
                                required
                              />
                            </div>
                            <div className="form-group">
                              <label htmlFor="webmail-email" className="block text-sm font-medium text-text-secondary mb-2">
                                Email
                              </label>
                              <Input
                                id="webmail-email"
                                type="email"
                                value={newSmtp.username}
                                onChange={(e) => setNewSmtp({ ...newSmtp, username: e.target.value })}
                                required
                              />
                            </div>
                            <div className="form-group">
                              <label htmlFor="webmail-password" className="block text-sm font-medium text-text-secondary mb-2">
                                Password
                              </label>
                              <Input
                                id="webmail-password"
                                type="password"
                                value={newSmtp.password}
                                onChange={(e) => setNewSmtp({ ...newSmtp, password: e.target.value })}
                                required
                              />
                            </div>
                          </>
                        )}

                        {newSmtp.providerType === 'api' && (
                          <>
                            <div className="form-group">
                              <label htmlFor="api-provider" className="block text-sm font-medium text-text-secondary mb-2">
                                API Provider
                              </label>
                              <Select
                                id="api-provider"
                                value={newSmtp.apiProvider || ''}
                                onChange={(e) => setNewSmtp({ ...newSmtp, apiProvider: e.target.value })}
                                options={apiProviders}
                                required
                              />
                            </div>
                            <div className="form-group">
                              <label htmlFor="api-key" className="block text-sm font-medium text-text-secondary mb-2">
                                API Key
                              </label>
                              <Input
                                id="api-key"
                                value={newSmtp.apiKey}
                                onChange={(e) => setNewSmtp({ ...newSmtp, apiKey: e.target.value })}
                                required
                              />
                            </div>
                            <div className="form-group">
                              <label htmlFor="api-region" className="block text-sm font-medium text-text-secondary mb-2">
                                Region
                              </label>
                              <Input
                                id="api-region"
                                value={newSmtp.region}
                                onChange={(e) => setNewSmtp({ ...newSmtp, region: e.target.value })}
                                required
                              />
                            </div>
                            <div className="form-group">
                              <label htmlFor="api-from-email" className="block text-sm font-medium text-text-secondary mb-2">
                                From Email
                              </label>
                              <Input
                                id="api-from-email"
                                type="email"
                                value={newSmtp.fromEmail}
                                onChange={(e) => setNewSmtp({ ...newSmtp, fromEmail: e.target.value })}
                                required
                              />
                            </div>
                            <div className="form-group">
                              <label htmlFor="api-from-name" className="block text-sm font-medium text-text-secondary mb-2">
                                From Name
                              </label>
                              <Input
                                id="api-from-name"
                                value={newSmtp.fromName}
                                onChange={(e) => setNewSmtp({ ...newSmtp, fromName: e.target.value })}
                                required
                              />
                            </div>
                          </>
                        )}

                        <div className="flex items-center space-x-2">
                          <input
                            type="checkbox"
                            checked={newSmtp.secure}
                            onChange={(e) => setNewSmtp({ ...newSmtp, secure: e.target.checked })}
                            className="rounded border-slate-700 text-accent focus:ring-accent"
                          />
                          <span className="text-text-primary">Use SSL/TLS</span>
                        </div>
                        <div className="flex justify-end space-x-2">
                          <Button
                            variant="secondary"
                            onClick={() => setShowAddSmtpModal(false)}
                          >
                            Cancel
                          </Button>
                          <Button type="submit">Add SMTP</Button>
                        </div>
                      </div>
                    </form>
                  </Modal>
                </div>
              )}

              {/* User Preferences */}
              {activeTab === 'preferences' && (
                <div className="space-y-6">
                  <h2 className="text-xl font-semibold text-text-primary">
                    User Preferences
                  </h2>

                  <div>
                    <label className="block text-sm font-medium text-text-secondary mb-2">
                      Theme
                    </label>
                    <Select
                      value={preferences.theme}
                      onChange={(e: ChangeEvent<HTMLSelectElement>) => handlePreferencesUpdate({ theme: e.target.value as UserPreferences['theme'] })}
                      options={[
                        { value: 'light', label: 'Light' },
                        { value: 'dark', label: 'Dark' },
                        { value: 'system', label: 'System' }
                      ]}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-text-secondary mb-2">
                      Notifications
                    </label>
                    <div className="space-y-2">
                      <label className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          checked={preferences.notifications.email}
                          onChange={(e: ChangeEvent<HTMLInputElement>) => handlePreferencesUpdate({
                            notifications: {
                              ...preferences.notifications,
                              email: e.target.checked
                            }
                          })}
                          className="rounded border-slate-700 text-accent focus:ring-accent"
                        />
                        <span className="text-text-primary">Email Notifications</span>
                      </label>
                      <label className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          checked={preferences.notifications.sms}
                          onChange={(e: ChangeEvent<HTMLInputElement>) => handlePreferencesUpdate({
                            notifications: {
                              ...preferences.notifications,
                              sms: e.target.checked
                            }
                          })}
                          className="rounded border-slate-700 text-accent focus:ring-accent"
                        />
                        <span className="text-text-primary">SMS Notifications</span>
                      </label>
                      <label className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          checked={preferences.notifications.desktop}
                          onChange={(e: ChangeEvent<HTMLInputElement>) => handlePreferencesUpdate({
                            notifications: {
                              ...preferences.notifications,
                              desktop: e.target.checked
                            }
                          })}
                          className="rounded border-slate-700 text-accent focus:ring-accent"
                        />
                        <span className="text-text-primary">Desktop Notifications</span>
                      </label>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-text-secondary mb-2">
                      Timezone
                    </label>
                    <Select
                      value={preferences.timezone}
                      onChange={(e: ChangeEvent<HTMLSelectElement>) => handlePreferencesUpdate({ timezone: e.target.value })}
                      options={[
                        { value: 'UTC', label: 'UTC' },
                        { value: 'EST', label: 'Eastern Time' },
                        { value: 'PST', label: 'Pacific Time' },
                        { value: 'GMT', label: 'Greenwich Mean Time' }
                      ]}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-text-secondary mb-2">
                      Language
                    </label>
                    <Select
                      value={preferences.language}
                      onChange={(e: ChangeEvent<HTMLSelectElement>) => handlePreferencesUpdate({ language: e.target.value })}
                      options={[
                        { value: 'en', label: 'English' },
                        { value: 'es', label: 'Spanish' },
                        { value: 'fr', label: 'French' },
                        { value: 'de', label: 'German' }
                      ]}
                    />
                  </div>
                </div>
              )}

              {/* Security Settings */}
              {activeTab === 'security' && (
                <div className="space-y-6">
                  <h2 className="text-xl font-semibold text-text-primary">
                    Security Settings
                  </h2>

                  <div>
                    <label className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={security.twoFactorEnabled}
                        onChange={(e: ChangeEvent<HTMLInputElement>) => handleSecurityUpdate({ twoFactorEnabled: e.target.checked })}
                        className="rounded border-slate-700 text-accent focus:ring-accent"
                      />
                      <span className="text-text-primary">Enable Two-Factor Authentication</span>
                    </label>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-text-secondary mb-2">
                      Session Timeout (minutes)
                    </label>
                    <Input
                      type="number"
                      value={security.sessionTimeout}
                      onChange={(e: ChangeEvent<HTMLInputElement>) => handleSecurityUpdate({ sessionTimeout: parseInt(e.target.value) })}
                      min={5}
                      max={120}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-text-secondary mb-2">
                      Password Expiry (days)
                    </label>
                    <Input
                      type="number"
                      value={security.passwordExpiry}
                      onChange={(e: ChangeEvent<HTMLInputElement>) => handleSecurityUpdate({ passwordExpiry: parseInt(e.target.value) })}
                      min={30}
                      max={365}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-text-secondary mb-2">
                      Maximum Login Attempts
                    </label>
                    <Input
                      type="number"
                      value={security.loginAttempts}
                      onChange={(e: ChangeEvent<HTMLInputElement>) => handleSecurityUpdate({ loginAttempts: parseInt(e.target.value) })}
                      min={3}
                      max={10}
                    />
                  </div>
                </div>
              )}

              {/* API Settings */}
              {activeTab === 'api' && (
                <div className="space-y-6">
                  <h2 className="text-xl font-semibold text-text-primary">
                    API Settings
                  </h2>

                  <div>
                    <label className="block text-sm font-medium text-text-secondary mb-2">
                      API Key
                    </label>
                    <div className="flex space-x-2">
                      <Input
                        type="password"
                        value={apiKey}
                        onChange={(e: ChangeEvent<HTMLInputElement>) => setApiKey(e.target.value)}
                        placeholder="Enter new API key"
                      />
                      <Button
                        onClick={handleApiKeyUpdate}
                        disabled={!apiKey}
                      >
                        Update
                      </Button>
                    </div>
                  </div>

                  <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700">
                    <h3 className="text-lg font-medium text-text-primary mb-2">
                      API Documentation
                    </h3>
                    <p className="text-text-secondary mb-4">
                      Access our comprehensive API documentation to learn how to integrate with our services.
                    </p>
                    <Button
                      variant="secondary"
                      onClick={() => window.open('https://docs.surprise-sender.com/api', '_blank')}
                    >
                      View Documentation
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SettingsPage;
