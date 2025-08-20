import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { toast } from 'react-hot-toast';
import {
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  TrashIcon,
  EyeIcon,
  CogIcon,
  ServerIcon,
  GlobeAltIcon,
  ShieldCheckIcon,
  ChartBarIcon,
  BoltIcon,
  DocumentArrowDownIcon,
  DocumentArrowUpIcon,
  FunnelIcon,
  MagnifyingGlassIcon,
  PlusIcon,
  PlayIcon,
  PauseIcon,
  StopIcon
} from '@heroicons/react/24/outline';

interface SmtpConfig {
  id: string;
  name: string;
  host: string;
  port: number;
  username: string;
  isActive: boolean;
  isValid: boolean;
  lastValidated?: string;
  lastError?: string;
  deliveryScore?: number;
  speedScore?: number;
  reputationScore?: number;
  testDuration?: number;
  stats?: {
    daily: number;
    monthly: number;
    total: number;
  };
  metadata?: {
    provider: string;
    region?: string;
    ssl: boolean;
    tls: boolean;
  };
}

interface ValidationResult {
  id: string;
  host: string;
  username: string;
  status: 'valid' | 'invalid' | 'testing';
  error?: string;
  deliveryScore?: number;
  speedScore?: number;
  reputationScore?: number;
  lastTested: Date;
  testDuration: number;
  details?: {
    connection: boolean;
    authentication: boolean;
    dns: boolean;
    blacklist: boolean;
    reputation: number;
  };
}

const AdvancedSmtpManager: React.FC = () => {
  const auth = useAuth();
  const [smtpConfigs, setSmtpConfigs] = useState<SmtpConfig[]>([]);
  const [validationResults, setValidationResults] = useState<ValidationResult[]>([]);
  const [isValidating, setIsValidating] = useState(false);
  const [selectedConfigs, setSelectedConfigs] = useState<string[]>([]);
  const [filterStatus, setFilterStatus] = useState<'all' | 'valid' | 'invalid' | 'testing'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<'name' | 'deliveryScore' | 'lastTested' | 'status'>('deliveryScore');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [bulkAction, setBulkAction] = useState<'validate' | 'activate' | 'deactivate' | 'delete'>('validate');
  const [showDetails, setShowDetails] = useState<string | null>(null);

  useEffect(() => {
    fetchSmtpConfigs();
  }, []);

  const fetchSmtpConfigs = async () => {
    try {
      const response = await fetch('/api/smtp-configurations');
      if (response.ok) {
        const data = await response.json();
        setSmtpConfigs(data.configurations || []);
      }
    } catch (error) {
      toast.error('Failed to fetch SMTP configurations');
    }
  };

  const validateSmtpConfigs = async (configIds: string[]) => {
    setIsValidating(true);
    try {
      const configsToValidate = smtpConfigs.filter(config => configIds.includes(config.id));
      
      const response = await fetch('/api/email/validate-smtp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ configs: configsToValidate })
      });

      if (response.ok) {
        const result = await response.json();
        setValidationResults(result.results || []);
        toast.success(`Validated ${result.valid} out of ${result.total} configurations`);
        
        // Update local configs with validation results
        setSmtpConfigs(prev => prev.map(config => {
          const validation = result.results?.find((r: any) => r.id === config.id);
          if (validation) {
            return {
              ...config,
              isValid: validation.status === 'valid',
              lastValidated: new Date().toISOString(),
              lastError: validation.error,
              deliveryScore: validation.deliveryScore,
              speedScore: validation.speedScore,
              reputationScore: validation.reputationScore
            };
          }
          return config;
        }));
      } else {
        toast.error('Validation failed');
      }
    } catch (error) {
      toast.error('Error during validation');
    } finally {
      setIsValidating(false);
    }
  };

  const handleBulkAction = async () => {
    if (selectedConfigs.length === 0) {
      toast.error('Please select configurations first');
      return;
    }

    switch (bulkAction) {
      case 'validate':
        await validateSmtpConfigs(selectedConfigs);
        break;
      case 'activate':
        await updateConfigStatus(selectedConfigs, true);
        break;
      case 'deactivate':
        await updateConfigStatus(selectedConfigs, false);
        break;
      case 'delete':
        await deleteConfigs(selectedConfigs);
        break;
    }
  };

  const updateConfigStatus = async (configIds: string[], isActive: boolean) => {
    try {
      const promises = configIds.map(id =>
        fetch(`/api/smtp-configurations/${id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ isActive })
        })
      );

      await Promise.all(promises);
      toast.success(`${isActive ? 'Activated' : 'Deactivated'} ${configIds.length} configurations`);
      fetchSmtpConfigs();
    } catch (error) {
      toast.error('Failed to update configurations');
    }
  };

  const deleteConfigs = async (configIds: string[]) => {
    if (!confirm(`Are you sure you want to delete ${configIds.length} configurations?`)) {
      return;
    }

    try {
      const promises = configIds.map(id =>
        fetch(`/api/smtp-configurations/${id}`, { method: 'DELETE' })
      );

      await Promise.all(promises);
      toast.success(`Deleted ${configIds.length} configurations`);
      setSelectedConfigs([]);
      fetchSmtpConfigs();
    } catch (error) {
      toast.error('Failed to delete configurations');
    }
  };

  const handleSelectAll = () => {
    if (selectedConfigs.length === filteredConfigs.length) {
      setSelectedConfigs([]);
    } else {
      setSelectedConfigs(filteredConfigs.map(config => config.id));
    }
  };

  const handleSelectConfig = (configId: string) => {
    setSelectedConfigs(prev =>
      prev.includes(configId)
        ? prev.filter(id => id !== configId)
        : [...prev, configId]
    );
  };

  const filteredConfigs = smtpConfigs
    .filter(config => {
      const matchesStatus = filterStatus === 'all' || 
        (filterStatus === 'valid' && config.isValid) ||
        (filterStatus === 'invalid' && !config.isValid) ||
        (filterStatus === 'testing' && !config.lastValidated);
      
      const matchesSearch = config.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        config.host.toLowerCase().includes(searchTerm.toLowerCase()) ||
        config.username.toLowerCase().includes(searchTerm.toLowerCase());
      
      return matchesStatus && matchesSearch;
    })
    .sort((a, b) => {
      let comparison = 0;
      switch (sortBy) {
        case 'name':
          comparison = a.name.localeCompare(b.name);
          break;
        case 'deliveryScore':
          comparison = (a.deliveryScore || 0) - (b.deliveryScore || 0);
          break;
        case 'lastTested':
          comparison = new Date(a.lastValidated || 0).getTime() - new Date(b.lastValidated || 0).getTime();
          break;
        case 'status':
          comparison = (a.isValid ? 1 : 0) - (b.isValid ? 1 : 0);
          break;
      }
      return sortOrder === 'asc' ? comparison : -comparison;
    });

  const getStatusIcon = (config: SmtpConfig) => {
    if (!config.lastValidated) {
      return <ClockIcon className="h-5 w-5 text-gray-400" />;
    }
    if (config.isValid) {
      return <CheckCircleIcon className="h-5 w-5 text-green-500" />;
    }
    return <XCircleIcon className="h-5 w-5 text-red-500" />;
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getScoreBg = (score: number) => {
    if (score >= 80) return 'bg-green-100';
    if (score >= 60) return 'bg-yellow-100';
    return 'bg-red-100';
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Advanced SMTP Manager</h1>
          <p className="mt-2 text-gray-600">Enterprise-grade SMTP configuration management with bulk validation</p>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <ServerIcon className="h-8 w-8 text-blue-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Configs</p>
                <p className="text-2xl font-bold text-gray-900">{smtpConfigs.length}</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <CheckCircleIcon className="h-8 w-8 text-green-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Valid</p>
                <p className="text-2xl font-bold text-gray-900">
                  {smtpConfigs.filter(c => c.isValid).length}
                </p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <XCircleIcon className="h-8 w-8 text-red-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Invalid</p>
                <p className="text-2xl font-bold text-gray-900">
                  {smtpConfigs.filter(c => !c.isValid).length}
                </p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <ChartBarIcon className="h-8 w-8 text-purple-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Avg Score</p>
                <p className="text-2xl font-bold text-gray-900">
                  {smtpConfigs.length > 0 
                    ? Math.round(smtpConfigs.reduce((sum, c) => sum + (c.deliveryScore || 0), 0) / smtpConfigs.length)
                    : 0
                  }
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Controls */}
        <div className="bg-white rounded-lg shadow mb-6">
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex flex-wrap items-center justify-between gap-4">
              {/* Search and Filters */}
              <div className="flex items-center space-x-4">
                <div className="relative">
                  <MagnifyingGlassIcon className="h-5 w-5 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Search configurations..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value as any)}
                  className="px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="all">All Status</option>
                  <option value="valid">Valid</option>
                  <option value="invalid">Invalid</option>
                  <option value="testing">Testing</option>
                </select>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as any)}
                  className="px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="deliveryScore">Sort by Score</option>
                  <option value="name">Sort by Name</option>
                  <option value="lastTested">Sort by Last Tested</option>
                  <option value="status">Sort by Status</option>
                </select>
                <button
                  onClick={() => setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc')}
                  className="p-2 text-gray-400 hover:text-gray-600"
                >
                  {sortOrder === 'asc' ? '↑' : '↓'}
                </button>
              </div>

              {/* Bulk Actions */}
              <div className="flex items-center space-x-4">
                <select
                  value={bulkAction}
                  onChange={(e) => setBulkAction(e.target.value as any)}
                  className="px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="validate">Validate Selected</option>
                  <option value="activate">Activate Selected</option>
                  <option value="deactivate">Deactivate Selected</option>
                  <option value="delete">Delete Selected</option>
                </select>
                <button
                  onClick={handleBulkAction}
                  disabled={selectedConfigs.length === 0 || isValidating}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isValidating ? 'Validating...' : 'Execute'}
                </button>
              </div>
            </div>
          </div>

          {/* Configuration List */}
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left">
                    <input
                      type="checkbox"
                      checked={selectedConfigs.length === filteredConfigs.length && filteredConfigs.length > 0}
                      onChange={handleSelectAll}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Configuration
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Delivery Score
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Speed Score
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Reputation
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Last Tested
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredConfigs.map((config) => (
                  <tr key={config.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <input
                        type="checkbox"
                        checked={selectedConfigs.includes(config.id)}
                        onChange={() => handleSelectConfig(config.id)}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-10 w-10">
                          <div className="h-10 w-10 rounded-full bg-gray-300 flex items-center justify-center">
                            <ServerIcon className="h-6 w-6 text-gray-600" />
                          </div>
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">{config.name}</div>
                          <div className="text-sm text-gray-500">{config.host}:{config.port}</div>
                          <div className="text-xs text-gray-400">{config.username}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        {getStatusIcon(config)}
                        <span className={`ml-2 inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          config.isValid 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {config.isValid ? 'Valid' : 'Invalid'}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getScoreBg(config.deliveryScore || 0)} ${getScoreColor(config.deliveryScore || 0)}`}>
                        {config.deliveryScore || 'N/A'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getScoreBg(config.speedScore || 0)} ${getScoreColor(config.speedScore || 0)}`}>
                        {config.speedScore || 'N/A'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getScoreBg(config.reputationScore || 0)} ${getScoreColor(config.reputationScore || 0)}`}>
                        {config.reputationScore || 'N/A'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {config.lastValidated 
                        ? new Date(config.lastValidated).toLocaleString()
                        : 'Never tested'
                      }
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex space-x-2">
                        <button
                          onClick={() => validateSmtpConfigs([config.id])}
                          disabled={isValidating}
                          className="text-blue-600 hover:text-blue-900 disabled:opacity-50"
                        >
                          <PlayIcon className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => setShowDetails(showDetails === config.id ? null : config.id)}
                          className="text-gray-600 hover:text-gray-900"
                        >
                          <EyeIcon className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => updateConfigStatus([config.id], !config.isActive)}
                          className="text-yellow-600 hover:text-yellow-900"
                        >
                          {config.isActive ? <PauseIcon className="h-4 w-4" /> : <PlayIcon className="h-4 w-4" />}
                        </button>
                        <button
                          onClick={() => deleteConfigs([config.id])}
                          className="text-red-600 hover:text-red-900"
                        >
                          <TrashIcon className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Validation Results */}
        {validationResults.length > 0 && (
          <div className="bg-white rounded-lg shadow">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900">Validation Results</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Host</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Scores</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Test Duration</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Error</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {validationResults.map((result) => (
                    <tr key={result.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {result.host}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          result.status === 'valid' ? 'bg-green-100 text-green-800' :
                          result.status === 'invalid' ? 'bg-red-100 text-red-800' : 'bg-yellow-100 text-yellow-800'
                        }`}>
                          {result.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <div className="space-y-1">
                          <div>Delivery: {result.deliveryScore || 'N/A'}</div>
                          <div>Speed: {result.speedScore || 'N/A'}</div>
                          <div>Reputation: {result.reputationScore || 'N/A'}</div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {result.testDuration}ms
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {result.error || '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdvancedSmtpManager;