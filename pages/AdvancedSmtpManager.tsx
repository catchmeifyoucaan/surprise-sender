import React, { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { smtp as smtpApi } from '../services/api';
import { toast } from 'react-hot-toast';

interface SmtpConfig {
  id: string;
  userId?: string;
  name?: string;
  host?: string;
  port?: number;
  username?: string;
  secure?: boolean;
  providerType?: 'smtp' | 'webmail' | 'api';
  webmailProvider?: string;
  apiProvider?: string;
  fromEmail?: string;
  fromName?: string;
  isActive?: boolean;
  isValid?: boolean;
  status?: 'active' | 'inactive' | 'error';
  lastValidated?: string;
  lastUsed?: string;
  createdAt?: string;
  updatedAt?: string;
  lastError?: string;
}

const concurrencyLimit = 10;

const AdvancedSmtpManager: React.FC = () => {
  const auth = useAuth();
  const [configs, setConfigs] = useState<SmtpConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadSummary, setUploadSummary] = useState<{
    total: number;
    successCount: number;
    failedCount: number;
    errors: string[];
  } | null>(null);
  const [validating, setValidating] = useState(false);
  const [validateProgress, setValidateProgress] = useState<{ done: number; total: number }>({ done: 0, total: 0 });
  const [mixedFile, setMixedFile] = useState<File | null>(null);
  const [mixedResult, setMixedResult] = useState<any | null>(null);
  const [mixUploading, setMixUploading] = useState(false);
  const [showMixedDetails, setShowMixedDetails] = useState(false);

  useEffect(() => {
    if (auth.user) {
      loadConfigs();
    }
  }, [auth.user]);

  const loadConfigs = async () => {
    setLoading(true);
    try {
      const list = await smtpApi.getConfigurations();
      setConfigs(list || []);
    } catch (e) {
      toast.error('Failed to load SMTP configurations');
    } finally {
      setLoading(false);
    }
  };

  const sortedConfigs = useMemo(() => {
    const copy = [...configs];
    copy.sort((a, b) => {
      const av = a.isValid ? 1 : 0;
      const bv = b.isValid ? 1 : 0;
      if (av !== bv) return bv - av;
      const as = a.status === 'active' ? 1 : 0;
      const bs = b.status === 'active' ? 1 : 0;
      if (as !== bs) return bs - as;
      const ad = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const bd = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return bd - ad;
    });
    return copy;
  }, [configs]);

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const selectAll = (checked: boolean) => {
    setSelectedIds(checked ? configs.map(c => c.id) : []);
  };

  const handleUpload = async () => {
    if (!file) { toast.error('Select a file (.csv, .txt, .xlsx)'); return; }
    setIsUploading(true);
    setUploadSummary(null);
    try {
      const res = await smtpApi.importConfigurations(file);
      setUploadSummary({
        total: res.total ?? 0,
        successCount: res.successCount ?? 0,
        failedCount: res.failedCount ?? 0,
        errors: Array.isArray(res.errors) ? res.errors.slice(0, 100) : []
      });
      toast.success(`Imported ${res.successCount || 0} of ${res.total || 0}`);
      await loadConfigs();
      setFile(null);
    } catch (e: any) {
      toast.error(e?.message || 'Upload failed');
    } finally {
      setIsUploading(false);
    }
  };

  const validateOne = async (id: string) => {
    try {
      await smtpApi.validateConfiguration(id);
      setConfigs(prev => prev.map(c => c.id === id ? { ...c, isValid: true, lastValidated: new Date().toISOString() } : c));
      toast.success('Validated');
    } catch (e: any) {
      toast.error('Validation failed');
    }
  };

  const validateSelected = async () => {
    if (selectedIds.length === 0) { toast.error('Select at least one SMTP'); return; }
    setValidating(true);
    setValidateProgress({ done: 0, total: selectedIds.length });
    try {
      let idx = 0;
      const runNext = async (): Promise<void> => {
        const i = idx++;
        if (i >= selectedIds.length) return;
        const id = selectedIds[i];
        try {
          await smtpApi.validateConfiguration(id);
          setConfigs(prev => prev.map(c => c.id === id ? { ...c, isValid: true, lastValidated: new Date().toISOString() } : c));
        } catch {
        } finally {
          setValidateProgress(prev => ({ done: prev.done + 1, total: prev.total }));
        }
        return runNext();
      };
      await Promise.all(Array.from({ length: Math.min(concurrencyLimit, selectedIds.length) }).map(() => runNext()));
      toast.success('Bulk validation completed');
    } finally {
      setValidating(false);
    }
  };

  const deleteSelected = async () => {
    if (selectedIds.length === 0) { toast.error('Select at least one SMTP'); return; }
    if (!window.confirm(`Delete ${selectedIds.length} SMTP configuration(s)?`)) return;
    try {
      await smtpApi.bulkDelete(selectedIds);
      toast.success('Deleted');
      setSelectedIds([]);
      await loadConfigs();
    } catch (e: any) {
      toast.error('Delete failed');
    }
  };

  if (auth.user?.role !== 'admin') {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <h3 className="text-lg font-medium text-gray-900 mb-2">Access Denied</h3>
          <p className="text-gray-500">Admin access required to manage SMTP configurations.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900">SMTP Manager</h1>
          <div className="flex items-center space-x-3">
            <input type="file" accept=".csv,.txt,.xlsx" onChange={(e) => setFile(e.target.files?.[0] || null)} />
            <button onClick={handleUpload} disabled={!file || isUploading} className={`px-4 py-2 rounded text-white ${(!file || isUploading) ? 'bg-gray-400' : 'bg-green-600 hover:bg-green-700'}`}>
              {isUploading ? 'Uploading...' : 'Upload SMTPs'}
            </button>
            <button onClick={validateSelected} disabled={validating || selectedIds.length === 0} className={`px-4 py-2 rounded text-white ${(validating || selectedIds.length === 0) ? 'bg-gray-400' : 'bg-blue-600 hover:bg-blue-700'}`}>
              {validating ? `Validating ${validateProgress.done}/${validateProgress.total}` : 'Validate Selected'}
            </button>
            <button onClick={deleteSelected} disabled={selectedIds.length === 0} className={`px-4 py-2 rounded text-white ${selectedIds.length === 0 ? 'bg-gray-400' : 'bg-red-600 hover:bg-red-700'}`}>
              Delete Selected
            </button>
          </div>
        </div>

        {/* Mixed Ingest */}
        <div className="mb-6 bg-white rounded-lg shadow p-4 border border-gray-200">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Mixed Upload (SMTP/Webmail/cPanel/phpMyAdmin/Emails)</h2>
            <div className="flex items-center space-x-3">
              <input type="file" accept=".txt,.csv" onChange={(e) => setMixedFile(e.target.files?.[0] || null)} />
              <button
                onClick={async () => {
                  if (!mixedFile) { toast.error('Select a mixed file'); return; }
                  setMixUploading(true);
                  try {
                    const { ingest } = await import('../services/api');
                    const res = await ingest.importMixed(mixedFile);
                    setMixedResult(res);
                    toast.success('Mixed file processed');
                    await loadConfigs();
                  } catch (e: any) {
                    toast.error(e?.message || 'Mixed upload failed');
                  } finally {
                    setMixUploading(false);
                    setMixedFile(null);
                  }
                }}
                disabled={!mixedFile || mixUploading}
                className={`px-4 py-2 rounded text-white ${(!mixedFile || mixUploading) ? 'bg-gray-400' : 'bg-indigo-600 hover:bg-indigo-700'}`}
              >
                {mixUploading ? 'Processing...' : 'Upload Mixed'}
              </button>
              {mixedResult && (
                <button
                  onClick={() => setShowMixedDetails(v => !v)}
                  className="px-3 py-2 rounded border text-gray-700"
                >
                  {showMixedDetails ? 'Hide Details' : 'Show Details'}
                </button>
              )}
            </div>
          </div>
          {mixedResult && (
            <div className="mt-4">
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                <div className="p-3 bg-gray-50 rounded border"><div className="text-gray-500">SMTP</div><div className="font-semibold">{mixedResult?.stats?.smtp} (valid {mixedResult?.stats?.smtpValid}, invalid {mixedResult?.stats?.smtpInvalid})</div></div>
                <div className="p-3 bg-gray-50 rounded border"><div className="text-gray-500">Webmail</div><div className="font-semibold">{mixedResult?.stats?.webmail} (valid {mixedResult?.stats?.webmailValid || 0}, invalid {mixedResult?.stats?.webmailInvalid || 0})</div></div>
                <div className="p-3 bg-gray-50 rounded border"><div className="text-gray-500">cPanel</div><div className="font-semibold">{mixedResult?.stats?.cpanel} (valid {mixedResult?.stats?.cpanelValid || 0}, invalid {mixedResult?.stats?.cpanelInvalid || 0})</div></div>
                <div className="p-3 bg-gray-50 rounded border"><div className="text-gray-500">phpMyAdmin</div><div className="font-semibold">{mixedResult?.stats?.phpmyadmin} (valid {mixedResult?.stats?.phpmyadminValid || 0}, invalid {mixedResult?.stats?.phpmyadminInvalid || 0})</div></div>
                <div className="p-3 bg-gray-50 rounded border"><div className="text-gray-500">Email:Pass</div><div className="font-semibold">{mixedResult?.stats?.emailPairs} (domains valid {mixedResult?.stats?.emailPairsValid || 0}, invalid {mixedResult?.stats?.emailPairsInvalid || 0})</div></div>
                <div className="p-3 bg-gray-50 rounded border"><div className="text-gray-500">Emails</div><div className="font-semibold">{mixedResult?.stats?.emails} (domains valid {mixedResult?.stats?.emailsValid || 0}, invalid {mixedResult?.stats?.emailsInvalid || 0})</div></div>
                <div className="p-3 bg-gray-50 rounded border col-span-full"><div className="text-gray-500">Unknown</div><div className="font-semibold">{mixedResult?.stats?.unknown}</div></div>
              </div>

              {showMixedDetails && (
                <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-3 border rounded">
                    <div className="font-semibold mb-2">Invalid SMTP (first 20)</div>
                    <ul className="text-sm list-disc list-inside max-h-48 overflow-y-auto">
                      {(mixedResult?.categories?.smtp?.invalid || []).slice(0, 20).map((it: any, idx: number) => (
                        <li key={idx}>{it.cfg?.username}@{it.cfg?.host}: {it.error}</li>
                      ))}
                    </ul>
                  </div>
                  <div className="p-3 border rounded">
                    <div className="font-semibold mb-2">Invalid Webmail (first 20)</div>
                    <ul className="text-sm list-disc list-inside max-h-48 overflow-y-auto">
                      {(mixedResult?.categories?.webmailValidated?.invalid || []).slice(0, 20).map((it: any, idx: number) => (
                        <li key={idx}>{it.item?.url}: {it.error}</li>
                      ))}
                    </ul>
                  </div>
                  <div className="p-3 border rounded">
                    <div className="font-semibold mb-2">Invalid cPanel (first 20)</div>
                    <ul className="text-sm list-disc list-inside max-h-48 overflow-y-auto">
                      {(mixedResult?.categories?.cpanelValidated?.invalid || []).slice(0, 20).map((it: any, idx: number) => (
                        <li key={idx}>{it.item?.url}: {it.error}</li>
                      ))}
                    </ul>
                  </div>
                  <div className="p-3 border rounded">
                    <div className="font-semibold mb-2">Invalid phpMyAdmin (first 20)</div>
                    <ul className="text-sm list-disc list-inside max-h-48 overflow-y-auto">
                      {(mixedResult?.categories?.phpmyadminValidated?.invalid || []).slice(0, 20).map((it: any, idx: number) => (
                        <li key={idx}>{it.item?.url}: {it.error}</li>
                      ))}
                    </ul>
                  </div>
                  <div className="p-3 border rounded">
                    <div className="font-semibold mb-2">Invalid Email Domains (first 20)</div>
                    <ul className="text-sm list-disc list-inside max-h-48 overflow-y-auto">
                      {(mixedResult?.categories?.emailsValidated?.invalid || []).slice(0, 20).map((it: any, idx: number) => (
                        <li key={idx}>{it.email}: {it.error}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {uploadSummary && (
          <div className="mb-6 bg-white rounded-lg shadow p-4 border border-gray-200">
            <h2 className="text-lg font-semibold mb-2">Upload Summary</h2>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <div className="text-sm text-gray-500">Total</div>
                <div className="text-xl font-bold">{uploadSummary.total}</div>
              </div>
              <div>
                <div className="text-sm text-gray-500">Valid</div>
                <div className="text-xl font-bold text-green-600">{uploadSummary.successCount}</div>
              </div>
              <div>
                <div className="text-sm text-gray-500">Invalid</div>
                <div className="text-xl font-bold text-red-600">{uploadSummary.failedCount}</div>
              </div>
            </div>
            {uploadSummary.errors && uploadSummary.errors.length > 0 && (
              <div className="mt-3 max-h-40 overflow-y-auto text-sm text-red-600">
                <ul className="list-disc list-inside">
                  {uploadSummary.errors.slice(0, 50).map((err, i) => (
                    <li key={i}>{err}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        <div className="bg-white rounded-lg shadow">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left">
                  <input type="checkbox" checked={selectedIds.length === configs.length && configs.length > 0} onChange={(e) => selectAll(e.target.checked)} />
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Host</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">User</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Valid</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {loading ? (
                <tr><td className="px-4 py-6" colSpan={7}>Loading...</td></tr>
              ) : sortedConfigs.length === 0 ? (
                <tr><td className="px-4 py-6 text-gray-500" colSpan={7}>No SMTP configurations found.</td></tr>
              ) : (
                sortedConfigs.map((c) => (
                  <tr key={c.id} className="hover:bg-gray-50">
                    <td className="px-4 py-2"><input type="checkbox" checked={selectedIds.includes(c.id)} onChange={() => toggleSelect(c.id)} /></td>
                    <td className="px-4 py-2">
                      <div className="text-sm font-medium text-gray-900">{c.name || `${c.host}:${c.port}`}</div>
                    </td>
                    <td className="px-4 py-2 text-sm text-gray-600">{c.host}:{c.port}</td>
                    <td className="px-4 py-2 text-sm text-gray-600">{c.username}</td>
                    <td className="px-4 py-2">
                      <span className={`px-2 py-1 rounded text-xs ${c.isValid ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                        {c.isValid ? 'Valid' : 'Invalid'}
                      </span>
                    </td>
                    <td className="px-4 py-2 text-sm text-gray-600">{c.status}</td>
                    <td className="px-4 py-2 space-x-2">
                      <button onClick={() => validateOne(c.id)} className="text-blue-600 hover:underline">Validate</button>
                      <button onClick={async () => { await smtpApi.deleteConfiguration(c.id); toast.success('Deleted'); loadConfigs(); }} className="text-red-600 hover:underline">Delete</button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default AdvancedSmtpManager;