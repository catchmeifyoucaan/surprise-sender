import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { smtp as smtpApi, email as emailApi } from '../services/api';
import { toast } from 'react-hot-toast';

interface SmtpConfig {
  id: string;
  name?: string;
  host: string;
  port: number;
  username: string;
  isActive: boolean;
  isValid?: boolean;
  lastValidated?: string;
}

const AdvancedSmtpManager: React.FC = () => {
  const auth = useAuth();
  const [configs, setConfigs] = useState<SmtpConfig[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);

  const fetchConfigs = async () => {
    setIsLoading(true);
    try {
      const data = await smtpApi.getConfigs();
      const list = Array.isArray(data) ? data : (data.configurations || []);
      setConfigs(list);
    } catch (e) {
      toast.error('Failed to load SMTP configs');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (auth.user) fetchConfigs();
  }, [auth.user]);

  const toggleSelect = (id: string) => {
    setSelected(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const validateSelected = async () => {
    if (selected.length === 0) { toast.error('Select at least one'); return; }
    try {
      const toValidate = configs.filter(c => selected.includes(c.id));
      const res = await emailApi.sendBulk([], []); // dummy to ensure auth interceptor; not used
      const result = await (await fetch('/api/email/validate-smtp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('surpriseSenderUser') || ''}` },
        body: JSON.stringify({ configs: toValidate })
      })).json();
      const results = result?.data?.results || result?.results || [];
      setConfigs(prev => prev.map(c => {
        const r = results.find((x: any) => x.id === c.id);
        return r ? { ...c, isValid: r.status ? r.status === 'valid' : !!r.success, lastValidated: new Date().toISOString() } : c;
      }));
      toast.success('Validation completed');
    } catch (e) {
      toast.error('Validation failed');
    }
  };

  const setActive = async (id: string, isActive: boolean) => {
    try {
      await smtpApi.updateConfig(id, { isActive });
      toast.success(isActive ? 'Activated' : 'Deactivated');
      fetchConfigs();
    } catch {
      toast.error('Update failed');
    }
  };

  const remove = async (id: string) => {
    if (!confirm('Delete configuration?')) return;
    try {
      await smtpApi.deleteConfig(id);
      toast.success('Deleted');
      fetchConfigs();
    } catch {
      toast.error('Delete failed');
    }
  };

  const upload = async () => {
    if (!uploadFile) { toast.error('Select a file'); return; }
    try {
      const form = new FormData();
      form.append('file', uploadFile);
      const res = await smtpApi.importConfigurations(form);
      toast.success(`Imported ${res.success || 0} / ${res.total || 0}`);
      setUploadFile(null);
      fetchConfigs();
    } catch (e) {
      toast.error('Import failed');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900">Advanced SMTP Manager</h1>
          <div className="flex items-center space-x-3">
            <input type="file" accept=".csv,.txt,.xlsx" onChange={(e) => setUploadFile(e.target.files?.[0] || null)} />
            <button onClick={upload} className="px-4 py-2 bg-green-600 text-white rounded">Upload</button>
            <button onClick={validateSelected} className="px-4 py-2 bg-blue-600 text-white rounded">Validate Selected</button>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left">Select</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Configuration</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {configs.map(c => (
                <tr key={c.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <input type="checkbox" checked={selected.includes(c.id)} onChange={() => toggleSelect(c.id)} />
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm font-medium text-gray-900">{c.name || `${c.host}:${c.port}`}</div>
                    <div className="text-sm text-gray-500">{c.username}</div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 rounded text-xs ${c.isValid ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                      {c.isValid ? 'Valid' : 'Invalid'}
                    </span>
                  </td>
                  <td className="px-6 py-4 space-x-2">
                    <button onClick={() => setActive(c.id, !c.isActive)} className="text-blue-600">{c.isActive ? 'Deactivate' : 'Activate'}</button>
                    <button onClick={() => remove(c.id)} className="text-red-600">Delete</button>
                  </td>
                </tr>
              ))}
              {configs.length === 0 && !isLoading && (
                <tr><td className="px-6 py-6 text-gray-500" colSpan={4}>No configurations found.</td></tr>
              )}
              {isLoading && (
                <tr><td className="px-6 py-6 text-gray-500" colSpan={4}>Loading...</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default AdvancedSmtpManager;