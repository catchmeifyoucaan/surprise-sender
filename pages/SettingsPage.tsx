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

const SettingsPage: React.FC = () => {
  const auth = useAuth();
  const [activeTab, setActiveTab] = useState<'preferences' | 'security' | 'api'>('preferences');
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

  useEffect(() => {
    if (!auth.isLoading && auth.user) {
      auth.logUserActivity('Viewed Settings Page.');
      fetchSettings();
    }
  }, [auth.isLoading, auth.user]);

  const fetchSettings = async () => {
    setIsLoading(true);
    try {
      const [prefsResponse, securityResponse] = await Promise.all([
        fetchWithAuth('/api/settings/preferences'),
        fetchWithAuth('/api/settings/security')
      ]);

      const [prefsData, securityData] = await Promise.all([
        prefsResponse.json(),
        securityResponse.json()
      ]);

      setPreferences(prefsData);
      setSecurity(securityData);
    } catch (error) {
      toast.error('Failed to load settings');
    } finally {
      setIsLoading(false);
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
