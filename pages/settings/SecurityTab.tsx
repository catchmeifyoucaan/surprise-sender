import React, { useState, useEffect, ChangeEvent } from 'react';
import Input from '../../components/common/Input';
import Button from '../../components/common/Button';
import { toast } from 'react-hot-toast';

function getJwtToken() {
  return localStorage.getItem('surpriseSenderUser');
}

interface SecuritySettings {
  twoFactorEnabled: boolean;
  sessionTimeout: number;
  passwordExpiry: number;
  loginAttempts: number;
}

const SecurityTab: React.FC<{ setSettingsError: (msg: string | null) => void }> = ({ setSettingsError }) => {
  const [security, setSecurity] = useState<SecuritySettings>({
    twoFactorEnabled: false,
    sessionTimeout: 30,
    passwordExpiry: 90,
    loginAttempts: 5
  });
  const [isFetching, setIsFetching] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const fetchWithAuth = async (url: string, options: any = {}) => {
    const token = getJwtToken();
    options.headers = options.headers || {};
    if (token) options.headers['Authorization'] = `Bearer ${token}`;
    return fetch(url, options);
  };

  const fetchSecurity = async () => {
    setIsFetching(true);
    setSettingsError(null);
    try {
      const res = await fetchWithAuth('/api/settings/security');
      if (!res.ok) throw new Error('Failed to fetch security settings');
      const data = await res.json();
      setSecurity(data);
    } catch (e: any) {
      setSettingsError(e.message || 'Failed to fetch security settings');
    } finally {
      setIsFetching(false);
    }
  };

  useEffect(() => { fetchSecurity(); }, []);

  const handleUpdate = async (updates: Partial<SecuritySettings>) => {
    setIsSaving(true);
    try {
      const token = getJwtToken();
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;
      const res = await fetch('/api/settings/security', {
        method: 'PATCH',
        headers,
        body: JSON.stringify(updates)
      });
      if (!res.ok) throw new Error('Failed to update security settings');
      toast.success('Security settings updated');
      setSecurity(prev => ({ ...prev, ...updates }));
    } catch (e: any) {
      toast.error(e.message || 'Failed to update security settings');
    } finally {
      setIsSaving(false);
    }
  };

  if (isFetching) return <div className="py-8 text-center">Loading...</div>;

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold text-text-primary">Security Settings</h2>
      <div>
        <label className="flex items-center space-x-2">
          <input
            type="checkbox"
            checked={security.twoFactorEnabled}
            onChange={e => handleUpdate({ twoFactorEnabled: e.target.checked })}
            className="rounded border-slate-700 text-accent focus:ring-accent"
          />
          <span className="text-text-primary">Enable Two-Factor Authentication</span>
        </label>
      </div>
      <div>
        <label className="block text-sm font-medium text-text-secondary mb-2">Session Timeout (minutes)</label>
        <Input
          type="number"
          value={security.sessionTimeout}
          onChange={e => handleUpdate({ sessionTimeout: parseInt(e.target.value) })}
          min={5}
          max={120}
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-text-secondary mb-2">Password Expiry (days)</label>
        <Input
          type="number"
          value={security.passwordExpiry}
          onChange={e => handleUpdate({ passwordExpiry: parseInt(e.target.value) })}
          min={30}
          max={365}
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-text-secondary mb-2">Maximum Login Attempts</label>
        <Input
          type="number"
          value={security.loginAttempts}
          onChange={e => handleUpdate({ loginAttempts: parseInt(e.target.value) })}
          min={3}
          max={10}
        />
      </div>
      <Button onClick={() => fetchSecurity()} disabled={isFetching || isSaving} variant="secondary">Reload</Button>
    </div>
  );
};

export default SecurityTab; 