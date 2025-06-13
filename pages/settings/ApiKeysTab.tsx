import React, { useState, useEffect } from 'react';
import Button from '../../components/common/Button';
import Input from '../../components/common/Input';
import { toast } from 'react-hot-toast';
import { ClipboardIcon, TrashIcon, PlusIcon } from '@heroicons/react/24/outline';

function getJwtToken() {
  return localStorage.getItem('surpriseSenderUser');
}

interface ApiKey {
  id: string;
  service: string;
  label: string;
  isActive: boolean;
  createdAt: string;
}

const ApiKeysTab: React.FC<{ setSettingsError: (msg: string | null) => void }> = ({ setSettingsError }) => {
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [isFetching, setIsFetching] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [form, setForm] = useState({ service: '', label: '', key: '' });

  const fetchWithAuth = async (url: string, options: any = {}) => {
    const token = getJwtToken();
    options.headers = options.headers || {};
    if (token) options.headers['Authorization'] = `Bearer ${token}`;
    return fetch(url, options);
  };

  const fetchApiKeys = async () => {
    setIsFetching(true);
    setSettingsError(null);
    try {
      const res = await fetchWithAuth('/api/settings/api-keys');
      if (!res.ok) throw new Error('Failed to fetch API keys');
      const data = await res.json();
      setApiKeys(data.data || []);
    } catch (e: any) {
      setSettingsError(e.message || 'Failed to fetch API keys');
    } finally {
      setIsFetching(false);
    }
  };

  useEffect(() => { fetchApiKeys(); }, []);

  const handleAdd = async () => {
    setIsAdding(true);
    try {
      const token = getJwtToken();
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;
      const res = await fetch('/api/settings/api-keys', {
        method: 'POST',
        headers,
        body: JSON.stringify(form)
      });
      if (!res.ok) throw new Error('Failed to add API key');
      toast.success('API key added');
      setForm({ service: '', label: '', key: '' });
      fetchApiKeys();
    } catch (e: any) {
      toast.error(e.message || 'Failed to add API key');
    } finally {
      setIsAdding(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Delete this API key?')) return;
    try {
      const res = await fetchWithAuth(`/api/settings/api-keys/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete API key');
      toast.success('API key deleted');
      fetchApiKeys();
    } catch (e: any) {
      toast.error(e.message || 'Failed to delete API key');
    }
  };

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold text-text-primary">API Keys</h2>
      <div className="flex gap-2 mb-4">
        <Input
          placeholder="Service (e.g. mailgun, openai)"
          value={form.service}
          onChange={e => setForm(f => ({ ...f, service: e.target.value }))}
        />
        <Input
          placeholder="Label"
          value={form.label}
          onChange={e => setForm(f => ({ ...f, label: e.target.value }))}
        />
        <Input
          placeholder="API Key"
          value={form.key}
          onChange={e => setForm(f => ({ ...f, key: e.target.value }))}
        />
        <Button onClick={handleAdd} disabled={isAdding || !form.service || !form.key} variant="primary">
          <PlusIcon className="w-4 h-4" /> Add
        </Button>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="bg-slate-800/50">
              <th className="px-4 py-2">Service</th>
              <th className="px-4 py-2">Label</th>
              <th className="px-4 py-2">Status</th>
              <th className="px-4 py-2">Created</th>
              <th className="px-4 py-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {isFetching ? (
              <tr><td colSpan={5} className="text-center py-8">Loading...</td></tr>
            ) : apiKeys.length === 0 ? (
              <tr><td colSpan={5} className="text-center py-8 text-text-secondary">No API keys found.</td></tr>
            ) : apiKeys.map((key) => (
              <tr key={key.id} className="border-b border-slate-700">
                <td className="px-4 py-2">{key.service}</td>
                <td className="px-4 py-2">{key.label}</td>
                <td className="px-4 py-2">{key.isActive ? 'Active' : 'Inactive'}</td>
                <td className="px-4 py-2">{new Date(key.createdAt).toLocaleString()}</td>
                <td className="px-4 py-2 flex gap-2">
                  <Button size="sm" variant="secondary" onClick={() => {navigator.clipboard.writeText(key.id); toast.success('Copied!')}}>
                    <ClipboardIcon className="w-4 h-4" />
                  </Button>
                  <Button size="sm" variant="danger" onClick={() => handleDelete(key.id)}>
                    <TrashIcon className="w-4 h-4" />
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default ApiKeysTab; 