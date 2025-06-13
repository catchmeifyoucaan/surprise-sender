import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Input, Button, Select, Modal, Tabs, Badge, FileUpload } from '../../components/common';
import { toast } from 'react-hot-toast';
import { smtp } from '../../services/api';
import type { SmtpConfiguration } from '../../types';
import {
  EnvelopeIcon,
  ServerIcon,
  ShieldCheckIcon,
  DocumentTextIcon,
  ArrowPathIcon,
  TrashIcon,
  CheckCircleIcon,
  XCircleIcon
} from '@heroicons/react/24/outline';

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

const SmtpTab: React.FC<{ setSettingsError: (msg: string | null) => void }> = ({ setSettingsError }) => {
  const [smtpConfigs, setSmtpConfigs] = useState<SmtpConfiguration[]>([]);
  const [isFetching, setIsFetching] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [addForm, setAddForm] = useState({
    providerType: 'smtp',
    name: '',
    host: '',
    port: '',
    username: '',
    password: '',
    secure: false,
    webmailProvider: '',
    apiProvider: '',
    apiKey: '',
    region: '',
    fromEmail: '',
    fromName: ''
  });
  const [isAdding, setIsAdding] = useState(false);
  const [isValidating, setIsValidating] = useState<string | null>(null);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadResults, setUploadResults] = useState<any[]>([]);
  const [uploadError, setUploadError] = useState('');
  const [selectedConfigs, setSelectedConfigs] = useState<string[]>([]);

  const fetchSmtpConfigs = async () => {
    setIsFetching(true);
    setSettingsError(null);
    try {
      const data = await smtp.getConfigurations();
      setSmtpConfigs(data);
    } catch (e: any) {
      setSettingsError(e.message || 'Failed to fetch SMTPs');
    } finally {
      setIsFetching(false);
    }
  };

  useEffect(() => { fetchSmtpConfigs(); }, []);

  const handleAddSmtp = async () => {
    if (!addForm.name) {
      toast.error('Name is required');
      return;
    }

    setIsAdding(true);
    setSettingsError(null);
    try {
      const payload: any = {
        providerType: addForm.providerType,
        name: addForm.name,
        fromEmail: addForm.fromEmail,
        fromName: addForm.fromName,
        security: {
          ssl: addForm.secure,
          tls: addForm.secure,
          starttls: !addForm.secure
        }
      };

      if (addForm.providerType === 'smtp') {
        payload.host = addForm.host;
        payload.port = parseInt(addForm.port);
        payload.username = addForm.username;
        payload.password = addForm.password;
        payload.secure = addForm.secure;
      } else if (addForm.providerType === 'webmail') {
        payload.webmailProvider = addForm.webmailProvider;
        payload.username = addForm.username;
        payload.password = addForm.password;
      } else if (addForm.providerType === 'api') {
        payload.apiProvider = addForm.apiProvider;
        payload.apiConfig = {
          apiKey: addForm.apiKey,
          endpoint: '',
          region: addForm.region
        };
      }

      await smtp.addConfiguration(payload);
      toast.success('Configuration added successfully!');
      setShowAddModal(false);
      setAddForm({
        providerType: 'smtp',
        name: '',
        host: '',
        port: '',
        username: '',
        password: '',
        secure: false,
        webmailProvider: '',
        apiProvider: '',
        apiKey: '',
        region: '',
        fromEmail: '',
        fromName: ''
      });
      fetchSmtpConfigs();
    } catch (e: any) {
      toast.error(e.message || 'Failed to add configuration');
    } finally {
      setIsAdding(false);
    }
  };

  const handleDeleteSmtp = async (id: string) => {
    if (!window.confirm('Delete this SMTP?')) return;
    try {
      await smtp.deleteConfiguration(id);
      toast.success('SMTP deleted');
      fetchSmtpConfigs();
    } catch (e: any) {
      toast.error(e.message || 'Failed to delete SMTP');
    }
  };

  const handleValidateSmtp = async (id: string) => {
    setIsValidating(id);
    try {
      await smtp.validateConfiguration(id);
      toast.success('SMTP validated!');
      fetchSmtpConfigs();
    } catch (e: any) {
      toast.error(e.message || 'Validation failed');
    } finally {
      setIsValidating(null);
    }
  };

  const handleFileUpload = async () => {
    if (!uploadFile) {
      setUploadError('Please select a file to upload');
      return;
    }

    if (selectedConfigs.length === 0) {
      setUploadError('Please select at least one SMTP configuration');
      return;
    }

    setUploadProgress(0);
    setUploadError('');
    setUploadResults([]);

    try {
      const result = await smtp.importConfigurations(uploadFile, selectedConfigs);
      setUploadProgress(100);
      setUploadResults(result.results || []);
      toast.success('File uploaded successfully!');
      setShowUploadModal(false);
      setUploadFile(null);
      setSelectedConfigs([]);
      fetchSmtpConfigs();
    } catch (e: any) {
      setUploadError(e.message || 'Upload failed');
    }
  };

  const handleConfigSelection = (id: string) => {
    setSelectedConfigs(prev => {
      if (prev.includes(id)) {
        return prev.filter(configId => configId !== id);
      } else {
        return [...prev, id];
      }
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold text-text-primary">SMTP Configurations</h2>
        <div className="space-x-4">
          <Button
            variant="secondary"
            onClick={() => setShowUploadModal(true)}
            disabled={smtpConfigs.length === 0}
          >
            <DocumentTextIcon className="w-5 h-5 mr-2" />
            Upload Recipients
          </Button>
          <Button
            variant="primary"
            onClick={() => setShowAddModal(true)}
          >
            <EnvelopeIcon className="w-5 h-5 mr-2" />
            Add SMTP
          </Button>
        </div>
      </div>

      {isFetching ? (
        <div className="text-center py-8">
          <ArrowPathIcon className="w-8 h-8 animate-spin mx-auto text-text-secondary" />
          <p className="mt-2 text-text-secondary">Loading SMTP configurations...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {smtpConfigs.map(config => (
            <div
              key={config.id}
              className="bg-primary rounded-lg shadow-lg p-6 border border-slate-700"
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-2">
                  <ServerIcon className="w-5 h-5 text-blue-400" />
                  <h3 className="text-lg font-medium text-text-primary">{config.name}</h3>
                </div>
                <Badge
                  variant={config.isValid ? 'success' : 'error'}
                  icon={config.isValid ? CheckCircleIcon : XCircleIcon}
                >
                  {config.isValid ? 'Valid' : 'Invalid'}
                </Badge>
              </div>

              <div className="space-y-2 text-sm text-text-secondary">
                <p>Type: {config.providerType}</p>
                {config.host && <p>Host: {config.host}</p>}
                {config.port && <p>Port: {config.port}</p>}
                {config.username && <p>Username: {config.username}</p>}
                {config.fromEmail && <p>From: {config.fromEmail}</p>}
                {config.fromName && <p>From Name: {config.fromName}</p>}
                {config.webmailProvider && <p>Webmail: {config.webmailProvider}</p>}
                {config.apiProvider && <p>API: {config.apiProvider}</p>}
                {config.apiConfig?.region && <p>Region: {config.apiConfig.region}</p>}
              </div>

              <div className="flex justify-end space-x-2 mt-4">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => handleValidateSmtp(config.id)}
                  disabled={isValidating === config.id}
                >
                  {isValidating === config.id ? (
                    <ArrowPathIcon className="w-4 h-4 animate-spin" />
                  ) : (
                    <ShieldCheckIcon className="w-4 h-4" />
                  )}
                  {isValidating === config.id ? 'Validating...' : 'Validate'}
                </Button>
                <Button
                  variant="danger"
                  size="sm"
                  onClick={() => handleDeleteSmtp(config.id)}
                >
                  <TrashIcon className="w-4 h-4" />
                  Delete
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add SMTP Modal */}
      <Modal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        title="Add SMTP Configuration"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-text-secondary">Name</label>
            <Input
              value={addForm.name}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setAddForm({ ...addForm, name: e.target.value })}
              placeholder="My SMTP Server"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-text-secondary">Provider Type</label>
            <Select
              value={addForm.providerType}
              onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setAddForm({ ...addForm, providerType: e.target.value })}
              options={providerTypes}
            />
          </div>

          {addForm.providerType === 'webmail' && (
            <div>
              <label className="block text-sm font-medium text-text-secondary">Webmail Provider</label>
              <Select
                value={addForm.webmailProvider}
                onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setAddForm({ ...addForm, webmailProvider: e.target.value })}
                options={webmailProviders}
              />
            </div>
          )}

          {addForm.providerType === 'api' && (
            <>
              <div>
                <label className="block text-sm font-medium text-text-secondary">API Provider</label>
                <Select
                  value={addForm.apiProvider}
                  onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setAddForm({ ...addForm, apiProvider: e.target.value })}
                  options={apiProviders}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-text-secondary">API Key</label>
                <Input
                  type="password"
                  value={addForm.apiKey}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setAddForm({ ...addForm, apiKey: e.target.value })}
                  placeholder="Enter your API key"
                  required
                />
              </div>
              {addForm.apiProvider === 'amazon-ses' && (
                <div>
                  <label className="block text-sm font-medium text-text-secondary">Region</label>
                  <Input
                    value={addForm.region}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setAddForm({ ...addForm, region: e.target.value })}
                    placeholder="e.g., us-east-1"
                    required
                  />
                </div>
              )}
            </>
          )}

          {addForm.providerType === 'smtp' && (
            <>
              <div>
                <label className="block text-sm font-medium text-text-secondary">Host</label>
                <Input
                  value={addForm.host}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setAddForm({ ...addForm, host: e.target.value })}
                  placeholder="smtp.example.com"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-text-secondary">Port</label>
                <Input
                  type="number"
                  value={addForm.port}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setAddForm({ ...addForm, port: e.target.value })}
                  placeholder="587"
                  required
                />
              </div>
            </>
          )}

          {(addForm.providerType === 'smtp' || addForm.providerType === 'webmail') && (
            <>
              <div>
                <label className="block text-sm font-medium text-text-secondary">Username</label>
                <Input
                  value={addForm.username}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setAddForm({ ...addForm, username: e.target.value })}
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-text-secondary">Password</label>
                <Input
                  type="password"
                  value={addForm.password}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setAddForm({ ...addForm, password: e.target.value })}
                  required
                />
              </div>
            </>
          )}

          <div>
            <label className="block text-sm font-medium text-text-secondary">From Email</label>
            <Input
              type="email"
              value={addForm.fromEmail}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setAddForm({ ...addForm, fromEmail: e.target.value })}
              placeholder="sender@example.com"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-text-secondary">From Name</label>
            <Input
              value={addForm.fromName}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setAddForm({ ...addForm, fromName: e.target.value })}
              placeholder="John Doe"
            />
          </div>

          {addForm.providerType === 'smtp' && (
            <div className="flex items-center">
              <input
                type="checkbox"
                id="secure"
                checked={addForm.secure}
                onChange={(e) => setAddForm({ ...addForm, secure: e.target.checked })}
                className="form-checkbox"
              />
              <label htmlFor="secure" className="ml-2 text-sm text-text-secondary">
                Use SSL/TLS
              </label>
            </div>
          )}

          <div className="flex justify-end space-x-4 mt-6">
            <Button
              variant="secondary"
              onClick={() => setShowAddModal(false)}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={handleAddSmtp}
              disabled={isAdding}
            >
              {isAdding ? 'Adding...' : 'Add Configuration'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Upload Modal */}
      <Modal
        isOpen={showUploadModal}
        onClose={() => setShowUploadModal(false)}
        title="Upload Recipients"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-text-secondary">Select SMTP Configurations</label>
            <div className="mt-2 space-y-2">
              {smtpConfigs.map(config => (
                <label key={config.id} className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={selectedConfigs.includes(config.id)}
                    onChange={() => handleConfigSelection(config.id)}
                    className="form-checkbox"
                  />
                  <span className="text-text-primary">{config.name}</span>
                </label>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-text-secondary">Upload File</label>
            <FileUpload
              accept=".txt,.csv,.xlsx,.xls"
              onChange={(file) => setUploadFile(file)}
              onError={(error) => setUploadError(error)}
            />
            <p className="mt-1 text-sm text-text-secondary">
              Supported formats: TXT, CSV, XLSX, XLS
            </p>
          </div>

          {uploadError && (
            <div className="text-red-400 text-sm">{uploadError}</div>
          )}

          {uploadProgress > 0 && (
            <div className="space-y-2">
              <div className="w-full bg-slate-700 rounded-full h-2.5">
                <div
                  className="bg-accent h-2.5 rounded-full transition-all duration-300"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
              <p className="text-sm text-text-secondary text-center">
                Uploading... {uploadProgress}%
              </p>
            </div>
          )}

          <div className="flex justify-end space-x-4 mt-6">
            <Button
              variant="secondary"
              onClick={() => setShowUploadModal(false)}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={handleFileUpload}
              disabled={!uploadFile || selectedConfigs.length === 0}
            >
              Upload
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default SmtpTab; 