import React, { useState, useEffect, ChangeEvent } from 'react';
import Select from '../../components/common/Select';
import Input from '../../components/common/Input';
import Button from '../../components/common/Button';
import { toast } from 'react-hot-toast';

function getJwtToken() {
  return localStorage.getItem('surpriseSenderUser');
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

const PreferencesTab: React.FC<{ setSettingsError: (msg: string | null) => void }> = ({ setSettingsError }) => {
  const [preferences, setPreferences] = useState<UserPreferences>({
    theme: 'dark',
    notifications: { email: true, sms: true, desktop: true },
    timezone: 'UTC',
    language: 'en'
  });
  const [isFetching, setIsFetching] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const fetchWithAuth = async (url: string, options: any = {}) => {
    const token = getJwtToken();
    options.headers = options.headers || {};
    if (token) options.headers['Authorization'] = `Bearer ${token}`;
    return fetch(url, options);
  };

  const fetchPreferences = async () => {
    setIsFetching(true);
    setSettingsError(null);
    try {
      const res = await fetchWithAuth('/api/settings/preferences');
      if (!res.ok) throw new Error('Failed to fetch preferences');
      const data = await res.json();
      setPreferences(data);
    } catch (e: any) {
      setSettingsError(e.message || 'Failed to fetch preferences');
    } finally {
      setIsFetching(false);
    }
  };

  useEffect(() => { fetchPreferences(); }, []);

  const handleUpdate = async (updates: Partial<UserPreferences>) => {
    setIsSaving(true);
    try {
      const token = getJwtToken();
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;
      const res = await fetch('/api/settings/preferences', {
        method: 'PATCH',
        headers,
        body: JSON.stringify(updates)
      });
      if (!res.ok) throw new Error('Failed to update preferences');
      toast.success('Preferences updated');
      setPreferences(prev => ({ ...prev, ...updates }));
    } catch (e: any) {
      toast.error(e.message || 'Failed to update preferences');
    } finally {
      setIsSaving(false);
    }
  };

  if (isFetching) return <div className="py-8 text-center">Loading...</div>;

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold text-text-primary">User Preferences</h2>
      <div>
        <label className="block text-sm font-medium text-text-secondary mb-2">Theme</label>
        <Select
          value={preferences.theme}
          onChange={(e: ChangeEvent<HTMLSelectElement>) => handleUpdate({ theme: e.target.value as UserPreferences['theme'] })}
          options={[
            { value: 'light', label: 'Light' },
            { value: 'dark', label: 'Dark' },
            { value: 'system', label: 'System' }
          ]}
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-text-secondary mb-2">Notifications</label>
        <div className="space-y-2">
          <label className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={preferences.notifications.email}
              onChange={e => handleUpdate({ notifications: { ...preferences.notifications, email: e.target.checked } })}
              className="rounded border-slate-700 text-accent focus:ring-accent"
            />
            <span className="text-text-primary">Email Notifications</span>
          </label>
          <label className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={preferences.notifications.sms}
              onChange={e => handleUpdate({ notifications: { ...preferences.notifications, sms: e.target.checked } })}
              className="rounded border-slate-700 text-accent focus:ring-accent"
            />
            <span className="text-text-primary">SMS Notifications</span>
          </label>
          <label className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={preferences.notifications.desktop}
              onChange={e => handleUpdate({ notifications: { ...preferences.notifications, desktop: e.target.checked } })}
              className="rounded border-slate-700 text-accent focus:ring-accent"
            />
            <span className="text-text-primary">Desktop Notifications</span>
          </label>
        </div>
      </div>
      <div>
        <label className="block text-sm font-medium text-text-secondary mb-2">Timezone</label>
        <Select
          value={preferences.timezone}
          onChange={e => handleUpdate({ timezone: e.target.value })}
          options={[
            { value: 'UTC', label: 'UTC' },
            { value: 'EST', label: 'Eastern Time' },
            { value: 'PST', label: 'Pacific Time' },
            { value: 'GMT', label: 'Greenwich Mean Time' }
          ]}
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-text-secondary mb-2">Language</label>
        <Select
          value={preferences.language}
          onChange={e => handleUpdate({ language: e.target.value })}
          options={[
            { value: 'en', label: 'English' },
            { value: 'es', label: 'Spanish' },
            { value: 'fr', label: 'French' },
            { value: 'de', label: 'German' }
          ]}
        />
      </div>
      <Button onClick={() => fetchPreferences()} disabled={isFetching || isSaving} variant="secondary">Reload</Button>
    </div>
  );
};

export default PreferencesTab; 