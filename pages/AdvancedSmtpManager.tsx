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

type MixedLists = {
  webmail: any[];
  cpanel: any[];
  phpmyadmin: any[];
  emailAccounts: any[];
  emails: any[];
};

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
  const [mixUploading, setMixUploading] = useState(false);

  const [mixedLists, setMixedLists] = useState<MixedLists>({ webmail: [], cpanel: [], phpmyadmin: [], emailAccounts: [], emails: [] });
  const [mixedSelected, setMixedSelected] = useState<{ [key: string]: Set<string> }>({ webmail: new Set(), cpanel: new Set(), phpmyadmin: new Set(), emailAccounts: new Set(), emails: new Set() });
  const [mixedLoading, setMixedLoading] = useState(false);

  useEffect(() => {
    if (auth.user) {
      loadConfigs();
      loadMixed();
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

  const loadMixed = async () => {
    setMixedLoading(true);
    try {
      const { mixed } = await import('../services/api');
      const lists = await mixed.list();
      setMixedLists(lists);
    } catch (e) {
      // ignore silently
    } finally {
      setMixedLoading(false);
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
      const res = await smtpApi.importConfigurations(file, undefined, { persistSmtp: true });
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

  const toggleMixedSelect = (type: keyof MixedLists, id: string) => {
    setMixedSelected(prev => {
      const copy = { ...prev, [type]: new Set(prev[type]) } as any;
      if (copy[type].has(id)) copy[type].delete(id); else copy[type].add(id);
      return copy;
    });
  };

  const deleteMixedSelected = async (type: keyof MixedLists) => {
    const ids = Array.from(mixedSelected[type] || []);
    if (ids.length === 0) { toast.error('Select at least one'); return; }
    if (!window.confirm(`Delete ${ids.length} item(s)?`)) return;
    try {
      const { mixed } = await import('../services/api');
      const mapKey = type === 'emailAccounts' ? 'emailAccounts' : (type as any);
      await mixed.bulkDelete(mapKey, ids);
      toast.success('Deleted');
      setMixedSelected(prev => ({ ...prev, [type]: new Set() }));
      await loadMixed();
    } catch (e: any) {
      toast.error(e?.message || 'Delete failed');
    }
  };

  const promoteEmailAccounts = async () => {
    const ids = Array.from(mixedSelected.emailAccounts || []);
    if (ids.length === 0) { toast.error('Select at least one email account'); return; }
    try {
      const { mixed } = await import('../services/api');
      const res = await mixed.promoteEmailAccounts(ids);
      toast.success(`Promoted ${res.created || 0} to SMTP`);
      setMixedSelected(prev => ({ ...prev, emailAccounts: new Set() }));
      await loadConfigs();
      await loadMixed();
    } catch (e: any) {
      toast.error(e?.message || 'Promote failed');
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
                    await ingest.importMixed(mixedFile, { persistMixed: true, persistSmtp: true });
                    toast.success('Mixed file processed: valid items saved');
                    await loadConfigs();
                    await loadMixed();
                    const section = document.getElementById('saved-mixed');
                    if (section) section.scrollIntoView({ behavior: 'smooth', block: 'start' });
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
            </div>
          </div>
        </div>

        {/* Saved Mixed Credentials */}
        <div id="saved-mixed" className="mb-6 bg-white rounded-lg shadow p-4 border border-gray-200">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold">Saved Mixed Credentials</h2>
            <button onClick={loadMixed} disabled={mixedLoading} className={`px-3 py-2 rounded border ${mixedLoading ? 'opacity-60' : ''}`}>{mixedLoading ? 'Refreshing...' : 'Refresh'}</button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Email Accounts */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="font-medium">Email Accounts</div>
                <div className="space-x-2">
                  <button onClick={promoteEmailAccounts} className="px-3 py-1.5 rounded bg-blue-600 text-white">Promote to SMTP</button>
                  <button onClick={() => deleteMixedSelected('emailAccounts')} className="px-3 py-1.5 rounded bg-red-600 text-white">Delete Selected</button>
                </div>
              </div>
              <div className="border rounded">
                <table className="min-w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-3 py-2"><input type="checkbox" onChange={(e) => {
                        const all = new Set<string>(e.target.checked ? mixedLists.emailAccounts.map((x: any) => x.id) : []);
                        setMixedSelected(prev => ({ ...prev, emailAccounts: all }));
                      }} checked={mixedLists.emailAccounts.length>0 && mixedSelected.emailAccounts.size === mixedLists.emailAccounts.length} /></th>
                      <th className="px-3 py-2 text-left">Email</th>
                      <th className="px-3 py-2 text-left">Valid</th>
                      <th className="px-3 py-2"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {mixedLists.emailAccounts.length === 0 ? (
                      <tr><td className="px-3 py-3 text-gray-500" colSpan={4}>No saved email accounts.</td></tr>
                    ) : mixedLists.emailAccounts.map((it: any) => (
                      <tr key={it.id} className="border-t">
                        <td className="px-3 py-2"><input type="checkbox" checked={mixedSelected.emailAccounts.has(it.id)} onChange={() => toggleMixedSelect('emailAccounts', it.id)} /></td>
                        <td className="px-3 py-2">{it.email}</td>
                        <td className="px-3 py-2">{it.isValid ? 'Yes' : 'No'}</td>
                        <td className="px-3 py-2 text-right"><button className="text-xs underline" onClick={()=>navigator.clipboard.writeText(`${it.email}:${it.password||''}`)}>Copy</button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Webmail */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="font-medium">Webmail</div>
                <div className="space-x-2">
                  <button onClick={() => deleteMixedSelected('webmail')} className="px-3 py-1.5 rounded bg-red-600 text-white">Delete Selected</button>
                </div>
              </div>
              <div className="border rounded">
                <table className="min-w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-3 py-2"><input type="checkbox" onChange={(e) => {
                        const all = new Set<string>(e.target.checked ? mixedLists.webmail.map((x: any) => x.id) : []);
                        setMixedSelected(prev => ({ ...prev, webmail: all }));
                      }} checked={mixedLists.webmail.length>0 && mixedSelected.webmail.size === mixedLists.webmail.length} /></th>
                      <th className="px-3 py-2 text-left">URL</th>
                      <th className="px-3 py-2 text-left">User</th>
                      <th className="px-3 py-2"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {mixedLists.webmail.length === 0 ? (
                      <tr><td className="px-3 py-3 text-gray-500" colSpan={4}>No saved webmail creds.</td></tr>
                    ) : mixedLists.webmail.map((it: any) => (
                      <tr key={it.id} className="border-t">
                        <td className="px-3 py-2"><input type="checkbox" checked={mixedSelected.webmail.has(it.id)} onChange={() => toggleMixedSelect('webmail', it.id)} /></td>
                        <td className="px-3 py-2"><a href={it.url} target="_blank" rel="noreferrer" className="text-blue-600 underline">{it.url}</a></td>
                        <td className="px-3 py-2">{it.username}</td>
                        <td className="px-3 py-2 text-right"><button className="text-xs underline" onClick={()=>navigator.clipboard.writeText(`${it.url}|${it.username}|***`)}>Copy</button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* cPanel */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="font-medium">cPanel</div>
                <div className="space-x-2">
                  <button onClick={() => deleteMixedSelected('cpanel')} className="px-3 py-1.5 rounded bg-red-600 text-white">Delete Selected</button>
                </div>
              </div>
              <div className="border rounded">
                <table className="min-w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-3 py-2"><input type="checkbox" onChange={(e) => {
                        const all = new Set<string>(e.target.checked ? mixedLists.cpanel.map((x: any) => x.id) : []);
                        setMixedSelected(prev => ({ ...prev, cpanel: all }));
                      }} checked={mixedLists.cpanel.length>0 && mixedSelected.cpanel.size === mixedLists.cpanel.length} /></th>
                      <th className="px-3 py-2 text-left">URL</th>
                      <th className="px-3 py-2 text-left">User</th>
                      <th className="px-3 py-2"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {mixedLists.cpanel.length === 0 ? (
                      <tr><td className="px-3 py-3 text-gray-500" colSpan={4}>No saved cPanel creds.</td></tr>
                    ) : mixedLists.cpanel.map((it: any) => (
                      <tr key={it.id} className="border-t">
                        <td className="px-3 py-2"><input type="checkbox" checked={mixedSelected.cpanel.has(it.id)} onChange={() => toggleMixedSelect('cpanel', it.id)} /></td>
                        <td className="px-3 py-2"><a href={it.url} target="_blank" rel="noreferrer" className="text-blue-600 underline">{it.url}</a></td>
                        <td className="px-3 py-2">{it.username}</td>
                        <td className="px-3 py-2 text-right"><button className="text-xs underline" onClick={()=>navigator.clipboard.writeText(`${it.url}|${it.username}|***`)}>Copy</button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* phpMyAdmin */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="font-medium">phpMyAdmin</div>
                <div className="space-x-2">
                  <button onClick={() => deleteMixedSelected('phpmyadmin')} className="px-3 py-1.5 rounded bg-red-600 text-white">Delete Selected</button>
                </div>
              </div>
              <div className="border rounded">
                <table className="min-w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-3 py-2"><input type="checkbox" onChange={(e) => {
                        const all = new Set<string>(e.target.checked ? mixedLists.phpmyadmin.map((x: any) => x.id) : []);
                        setMixedSelected(prev => ({ ...prev, phpmyadmin: all }));
                      }} checked={mixedLists.phpmyadmin.length>0 && mixedSelected.phpmyadmin.size === mixedLists.phpmyadmin.length} /></th>
                      <th className="px-3 py-2 text-left">URL</th>
                      <th className="px-3 py-2 text-left">User</th>
                      <th className="px-3 py-2"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {mixedLists.phpmyadmin.length === 0 ? (
                      <tr><td className="px-3 py-3 text-gray-500" colSpan={4}>No saved phpMyAdmin creds.</td></tr>
                    ) : mixedLists.phpmyadmin.map((it: any) => (
                      <tr key={it.id} className="border-t">
                        <td className="px-3 py-2"><input type="checkbox" checked={mixedSelected.phpmyadmin.has(it.id)} onChange={() => toggleMixedSelect('phpmyadmin', it.id)} /></td>
                        <td className="px-3 py-2"><a href={it.url} target="_blank" rel="noreferrer" className="text-blue-600 underline">{it.url}</a></td>
                        <td className="px-3 py-2">{it.username}</td>
                        <td className="px-3 py-2 text-right"><button className="text-xs underline" onClick={()=>navigator.clipboard.writeText(`${it.url}|${it.username}|***`)}>Copy</button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Emails */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="font-medium">Emails</div>
                <div className="space-x-2">
                  <button onClick={() => deleteMixedSelected('emails')} className="px-3 py-1.5 rounded bg-red-600 text-white">Delete Selected</button>
                </div>
              </div>
              <div className="border rounded">
                <table className="min-w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-3 py-2"><input type="checkbox" onChange={(e) => {
                        const all = new Set<string>(e.target.checked ? mixedLists.emails.map((x: any) => x.id) : []);
                        setMixedSelected(prev => ({ ...prev, emails: all }));
                      }} checked={mixedLists.emails.length>0 && mixedSelected.emails.size === mixedLists.emails.length} /></th>
                      <th className="px-3 py-2 text-left">Email</th>
                      <th className="px-3 py-2"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {mixedLists.emails.length === 0 ? (
                      <tr><td className="px-3 py-3 text-gray-500" colSpan={3}>No saved emails.</td></tr>
                    ) : mixedLists.emails.map((it: any) => (
                      <tr key={it.id} className="border-t">
                        <td className="px-3 py-2"><input type="checkbox" checked={mixedSelected.emails.has(it.id)} onChange={() => toggleMixedSelect('emails', it.id)} /></td>
                        <td className="px-3 py-2">{it.email}</td>
                        <td className="px-3 py-2 text-right"><button className="text-xs underline" onClick={()=>navigator.clipboard.writeText(it.email)}>Copy</button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
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