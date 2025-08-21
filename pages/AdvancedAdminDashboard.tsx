import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { toast } from 'react-hot-toast';
import {
  ChartBarIcon,
  UsersIcon,
  EnvelopeIcon,
  ShieldCheckIcon,
  CogIcon,
  EyeIcon,
  TrashIcon,
  CheckCircleIcon,
  XCircleIcon,
  ExclamationTriangleIcon,
  ClockIcon,
  ServerIcon,
  GlobeAltIcon,
  CpuChipIcon,
  ChartPieIcon,
  DocumentTextIcon,
  BellIcon,
  KeyIcon,
  DatabaseIcon,
  NetworkIcon
} from '@heroicons/react/24/outline';

interface SystemStats {
  totalUsers: number;
  activeUsers: number;
  totalEmails: number;
  deliveredEmails: number;
  failedEmails: number;
  successRate: number;
  activeCampaigns: number;
  systemLoad: number;
  memoryUsage: number;
  diskUsage: number;
  networkTraffic: number;
}

interface UserActivity {
  id: string;
  userId: string;
  userName: string;
  action: string;
  timestamp: string;
  ipAddress: string;
  userAgent: string;
  status: 'success' | 'failed' | 'warning';
  metadata?: any;
}

interface EmailCampaign {
  id: string;
  name: string;
  userId: string;
  userName: string;
  status: 'active' | 'paused' | 'completed' | 'failed';
  totalRecipients: number;
  sent: number;
  delivered: number;
  failed: number;
  opened: number;
  clicked: number;
  createdAt: string;
  lastActivity: string;
}

interface SystemAlert {
  id: string;
  type: 'error' | 'warning' | 'info' | 'success';
  title: string;
  message: string;
  timestamp: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  resolved: boolean;
}

const AdvancedAdminDashboard: React.FC = () => {
  const auth = useAuth();
  const [systemStats, setSystemStats] = useState<SystemStats>({
    totalUsers: 0,
    activeUsers: 0,
    totalEmails: 0,
    deliveredEmails: 0,
    failedEmails: 0,
    successRate: 0,
    activeCampaigns: 0,
    systemLoad: 0,
    memoryUsage: 0,
    diskUsage: 0,
    networkTraffic: 0
  });
  const [userActivities, setUserActivities] = useState<UserActivity[]>([]);
  const [emailCampaigns, setEmailCampaigns] = useState<EmailCampaign[]>([]);
  const [systemAlerts, setSystemAlerts] = useState<SystemAlert[]>([]);
  const [selectedTimeRange, setSelectedTimeRange] = useState('24h');
  const [isLoading, setIsLoading] = useState(true);
  const [selectedView, setSelectedView] = useState<'overview' | 'users' | 'campaigns' | 'system' | 'security'>('overview');

  useEffect(() => {
    if (auth.user?.role === 'admin') {
      fetchDashboardData();
      const interval = setInterval(fetchDashboardData, 30000); // Refresh every 30 seconds
      return () => clearInterval(interval);
    }
  }, [auth.user, selectedTimeRange]);

  const fetchDashboardData = async () => {
    setIsLoading(true);
    try {
      const token = localStorage.getItem('surpriseSenderUser');
      const authHeader = token ? { Authorization: `Bearer ${token}` } : {};
      const [stats, activities, campaigns, alerts] = await Promise.all([
        fetch(`/api/admin/stats?timeRange=${selectedTimeRange}`, { headers: { ...authHeader } }).then(r => r.json()).then(d => d.data || d),
        fetch(`/api/admin/activities?timeRange=${selectedTimeRange}`, { headers: { ...authHeader } }).then(r => r.json()).then(d => d.data || d),
        fetch(`/api/admin/campaigns?timeRange=${selectedTimeRange}`, { headers: { ...authHeader } }).then(r => r.json()).then(d => d.data || d),
        fetch(`/api/admin/alerts`, { headers: { ...authHeader } }).then(r => r.json()).then(d => d.data || d)
      ]);
      setSystemStats(stats);
      setUserActivities(activities);
      setEmailCampaigns(campaigns);
      setSystemAlerts(alerts);
    } catch (error) {
      toast.error('Failed to load dashboard data');
    } finally {
      setIsLoading(false);
    }
  };

  const handleUserAction = async (userId: string, action: 'suspend' | 'activate' | 'delete') => {
    try {
      const token = localStorage.getItem('surpriseSenderUser');
      const response = await fetch(`/api/admin/users/${userId}/${action}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: token ? `Bearer ${token}` : '' }
      });

      if (response.ok) {
        toast.success(`User ${action}ed successfully`);
        fetchDashboardData();
      } else {
        toast.error(`Failed to ${action} user`);
      }
    } catch (error) {
      toast.error(`Error ${action}ing user`);
    }
  };

  const handleCampaignAction = async (campaignId: string, action: 'pause' | 'resume' | 'stop') => {
    try {
      const token = localStorage.getItem('surpriseSenderUser');
      const response = await fetch(`/api/admin/campaigns/${campaignId}/${action}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: token ? `Bearer ${token}` : '' }
      });

      if (response.ok) {
        toast.success(`Campaign ${action}d successfully`);
        fetchDashboardData();
      } else {
        toast.error(`Failed to ${action} campaign`);
      }
    } catch (error) {
      toast.error(`Error ${action}ing campaign`);
    }
  };

  const resolveAlert = async (alertId: string) => {
    try {
      const token = localStorage.getItem('surpriseSenderUser');
      const response = await fetch(`/api/admin/alerts/${alertId}/resolve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: token ? `Bearer ${token}` : '' }
      });

      if (response.ok) {
        toast.success('Alert resolved');
        setSystemAlerts(prev => prev.filter(alert => alert.id !== alertId));
      } else {
        toast.error('Failed to resolve alert');
      }
    } catch (error) {
      toast.error('Error resolving alert');
    }
  };

  const StatCard: React.FC<{
    title: string;
    value: string | number;
    icon: React.ReactNode;
    trend?: number;
    color: string;
    subtitle?: string;
  }> = ({ title, value, icon, trend, color, subtitle }) => (
    <div className="bg-white rounded-lg shadow-lg p-6 border border-gray-200">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-medium text-gray-900">{title}</h3>
        <div className={`p-2 rounded-lg ${color}`}>{icon}</div>
      </div>
      <div className="flex items-end justify-between">
        <div>
          <p className="text-3xl font-bold text-gray-900">{value}</p>
          {subtitle && <p className="text-sm text-gray-500 mt-1">{subtitle}</p>}
        </div>
        {trend !== undefined && (
          <div className={`flex items-center text-sm ${trend >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            {trend >= 0 ? '↗' : '↘'} {Math.abs(trend)}%
          </div>
        )}
      </div>
    </div>
  );

  const OverviewTab = () => (
    <div className="space-y-6">
      {/* System Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Total Users"
          value={systemStats.totalUsers}
          icon={<UsersIcon className="w-6 h-6" />}
          color="bg-blue-100 text-blue-600"
          subtitle={`${systemStats.activeUsers} active`}
        />
        <StatCard
          title="Email Success Rate"
          value={`${systemStats.successRate}%`}
          icon={<EnvelopeIcon className="w-6 h-6" />}
          color="bg-green-100 text-green-600"
          subtitle={`${systemStats.deliveredEmails}/${systemStats.totalEmails} delivered`}
        />
        <StatCard
          title="Active Campaigns"
          value={systemStats.activeCampaigns}
          icon={<ChartBarIcon className="w-6 h-6" />}
          color="bg-purple-100 text-purple-600"
        />
        <StatCard
          title="System Load"
          value={`${systemStats.systemLoad}%`}
          icon={<CpuChipIcon className="w-6 h-6" />}
          color={systemStats.systemLoad > 80 ? "bg-red-100 text-red-600" : "bg-yellow-100 text-yellow-600"}
        />
      </div>

      {/* System Health */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-white rounded-lg shadow-lg p-6 border border-gray-200">
          <h3 className="text-lg font-medium text-gray-900 mb-4">System Health</h3>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Memory Usage</span>
              <div className="flex items-center space-x-2">
                <div className="w-24 bg-gray-200 rounded-full h-2">
                  <div 
                    className={`h-2 rounded-full ${systemStats.memoryUsage > 80 ? 'bg-red-500' : systemStats.memoryUsage > 60 ? 'bg-yellow-500' : 'bg-green-500'}`}
                    style={{ width: `${systemStats.memoryUsage}%` }}
                  />
                </div>
                <span className="text-sm font-medium">{systemStats.memoryUsage}%</span>
              </div>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Disk Usage</span>
              <div className="flex items-center space-x-2">
                <div className="w-24 bg-gray-200 rounded-full h-2">
                  <div 
                    className={`h-2 rounded-full ${systemStats.diskUsage > 80 ? 'bg-red-500' : systemStats.diskUsage > 60 ? 'bg-yellow-500' : 'bg-green-500'}`}
                    style={{ width: `${systemStats.diskUsage}%` }}
                  />
                </div>
                <span className="text-sm font-medium">{systemStats.diskUsage}%</span>
              </div>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Network Traffic</span>
              <span className="text-sm font-medium">{systemStats.networkTraffic} MB/s</span>
            </div>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="bg-white rounded-lg shadow-lg p-6 border border-gray-200">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Recent Activity</h3>
          <div className="space-y-3">
            {userActivities.slice(0, 5).map((activity) => (
              <div key={activity.id} className="flex items-center space-x-3">
                <div className={`w-2 h-2 rounded-full ${
                  activity.status === 'success' ? 'bg-green-500' : 
                  activity.status === 'failed' ? 'bg-red-500' : 'bg-yellow-500'
                }`} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{activity.userName}</p>
                  <p className="text-xs text-gray-500 truncate">{activity.action}</p>
                </div>
                <span className="text-xs text-gray-400">{new Date(activity.timestamp).toLocaleTimeString()}</span>
              </div>
            ))}
          </div>
        </div>

        {/* System Alerts */}
        <div className="bg-white rounded-lg shadow-lg p-6 border border-gray-200">
          <h3 className="text-lg font-medium text-gray-900 mb-4">System Alerts</h3>
          <div className="space-y-3">
            {systemAlerts.filter(alert => !alert.resolved).slice(0, 5).map((alert) => (
              <div key={alert.id} className="flex items-start space-x-3">
                <div className={`w-2 h-2 rounded-full mt-2 ${
                  alert.severity === 'critical' ? 'bg-red-500' :
                  alert.severity === 'high' ? 'bg-orange-500' :
                  alert.severity === 'medium' ? 'bg-yellow-500' : 'bg-blue-500'
                }`} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900">{alert.title}</p>
                  <p className="text-xs text-gray-500">{alert.message}</p>
                  <button
                    onClick={() => resolveAlert(alert.id)}
                    className="text-xs text-blue-600 hover:text-blue-800 mt-1"
                  >
                    Resolve
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );

  const UsersTab = () => (
    <div className="bg-white rounded-lg shadow-lg border border-gray-200">
      <div className="px-6 py-4 border-b border-gray-200">
        <h3 className="text-lg font-medium text-gray-900">User Management</h3>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">User</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Last Activity</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Emails Sent</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {userActivities.map((activity) => (
              <tr key={activity.id}>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    <div className="flex-shrink-0 h-10 w-10">
                      <div className="h-10 w-10 rounded-full bg-gray-300 flex items-center justify-center">
                        <UsersIcon className="h-6 w-6 text-gray-600" />
                      </div>
                    </div>
                    <div className="ml-4">
                      <div className="text-sm font-medium text-gray-900">{activity.userName}</div>
                      <div className="text-sm text-gray-500">{activity.ipAddress}</div>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                    activity.status === 'success' ? 'bg-green-100 text-green-800' :
                    activity.status === 'failed' ? 'bg-red-100 text-red-800' : 'bg-yellow-100 text-yellow-800'
                  }`}>
                    {activity.status}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {new Date(activity.timestamp).toLocaleString()}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {/* Email count would come from user stats */}
                  N/A
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                  <div className="flex space-x-2">
                    <button
                      onClick={() => handleUserAction(activity.userId, 'suspend')}
                      className="text-yellow-600 hover:text-yellow-900"
                    >
                      Suspend
                    </button>
                    <button
                      onClick={() => handleUserAction(activity.userId, 'activate')}
                      className="text-green-600 hover:text-green-900"
                    >
                      Activate
                    </button>
                    <button
                      onClick={() => handleUserAction(activity.userId, 'delete')}
                      className="text-red-600 hover:text-red-900"
                    >
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  const CampaignsTab = () => (
    <div className="bg-white rounded-lg shadow-lg border border-gray-200">
      <div className="px-6 py-4 border-b border-gray-200">
        <h3 className="text-lg font-medium text-gray-900">Campaign Management</h3>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Campaign</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Owner</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Progress</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Success Rate</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {emailCampaigns.map((campaign) => (
              <tr key={campaign.id}>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm font-medium text-gray-900">{campaign.name}</div>
                  <div className="text-sm text-gray-500">Created {new Date(campaign.createdAt).toLocaleDateString()}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{campaign.userName}</td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                    campaign.status === 'active' ? 'bg-green-100 text-green-800' :
                    campaign.status === 'paused' ? 'bg-yellow-100 text-yellow-800' :
                    campaign.status === 'completed' ? 'bg-blue-100 text-blue-800' : 'bg-red-100 text-red-800'
                  }`}>
                    {campaign.status}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    <div className="w-16 bg-gray-200 rounded-full h-2 mr-2">
                      <div 
                        className="bg-blue-600 h-2 rounded-full"
                        style={{ width: `${(campaign.sent / campaign.totalRecipients) * 100}%` }}
                      />
                    </div>
                    <span className="text-sm text-gray-500">{campaign.sent}/{campaign.totalRecipients}</span>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {campaign.totalRecipients > 0 ? `${Math.round((campaign.delivered / campaign.totalRecipients) * 100)}%` : 'N/A'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                  <div className="flex space-x-2">
                    {campaign.status === 'active' && (
                      <button
                        onClick={() => handleCampaignAction(campaign.id, 'pause')}
                        className="text-yellow-600 hover:text-yellow-900"
                      >
                        Pause
                      </button>
                    )}
                    {campaign.status === 'paused' && (
                      <button
                        onClick={() => handleCampaignAction(campaign.id, 'resume')}
                        className="text-green-600 hover:text-green-900"
                      >
                        Resume
                      </button>
                    )}
                    <button
                      onClick={() => handleCampaignAction(campaign.id, 'stop')}
                      className="text-red-600 hover:text-red-900"
                    >
                      Stop
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  const SystemTab = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow-lg p-6 border border-gray-200">
          <h3 className="text-lg font-medium text-gray-900 mb-4">System Performance</h3>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">CPU Usage</span>
              <span className="text-sm font-medium">{systemStats.systemLoad}%</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Memory Usage</span>
              <span className="text-sm font-medium">{systemStats.memoryUsage}%</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Disk Usage</span>
              <span className="text-sm font-medium">{systemStats.diskUsage}%</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Network Traffic</span>
              <span className="text-sm font-medium">{systemStats.networkTraffic} MB/s</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-lg p-6 border border-gray-200">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Email Statistics</h3>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Total Emails</span>
              <span className="text-sm font-medium">{systemStats.totalEmails.toLocaleString()}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Delivered</span>
              <span className="text-sm font-medium text-green-600">{systemStats.deliveredEmails.toLocaleString()}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Failed</span>
              <span className="text-sm font-medium text-red-600">{systemStats.failedEmails.toLocaleString()}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Success Rate</span>
              <span className="text-sm font-medium">{systemStats.successRate}%</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const SecurityTab = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow-lg p-6 border border-gray-200">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Security Overview</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
              <div className="flex items-center">
                <ShieldCheckIcon className="h-5 w-5 text-green-600 mr-2" />
                <span className="text-sm font-medium text-green-800">System Secure</span>
              </div>
              <CheckCircleIcon className="h-5 w-5 text-green-600" />
            </div>
            <div className="flex items-center justify-between p-3 bg-yellow-50 rounded-lg">
              <div className="flex items-center">
                <ExclamationTriangleIcon className="h-5 w-5 text-yellow-600 mr-2" />
                <span className="text-sm font-medium text-yellow-800">2 Failed Login Attempts</span>
              </div>
              <span className="text-sm text-yellow-600">Last 24h</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
              <div className="flex items-center">
                <KeyIcon className="h-5 w-5 text-blue-600 mr-2" />
                <span className="text-sm font-medium text-blue-800">API Keys Active</span>
              </div>
              <span className="text-sm text-blue-600">12 keys</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-lg p-6 border border-gray-200">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Recent Security Events</h3>
          <div className="space-y-3">
            {userActivities.filter(activity => activity.status === 'failed').slice(0, 5).map((activity) => (
              <div key={activity.id} className="flex items-center space-x-3 p-2 bg-red-50 rounded">
                <XCircleIcon className="h-4 w-4 text-red-600" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-red-800">{activity.userName}</p>
                  <p className="text-xs text-red-600">{activity.action}</p>
                </div>
                <span className="text-xs text-red-500">{new Date(activity.timestamp).toLocaleTimeString()}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );

  if (auth.user?.role !== 'admin') {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <ShieldCheckIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Access Denied</h3>
          <p className="text-gray-500">You don't have permission to access the admin dashboard.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Advanced Admin Dashboard</h1>
          <p className="mt-2 text-gray-600">Super Manager Control Panel</p>
        </div>

        {/* Time Range Selector */}
        <div className="mb-6">
          <select
            value={selectedTimeRange}
            onChange={(e) => setSelectedTimeRange(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="1h">Last Hour</option>
            <option value="24h">Last 24 Hours</option>
            <option value="7d">Last 7 Days</option>
            <option value="30d">Last 30 Days</option>
          </select>
        </div>

        {/* Navigation Tabs */}
        <div className="mb-6">
          <nav className="flex space-x-8">
            {[
              { id: 'overview', name: 'Overview', icon: ChartBarIcon },
              { id: 'users', name: 'Users', icon: UsersIcon },
              { id: 'campaigns', name: 'Campaigns', icon: EnvelopeIcon },
              { id: 'system', name: 'System', icon: ServerIcon },
              { id: 'security', name: 'Security', icon: ShieldCheckIcon }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setSelectedView(tab.id as any)}
                className={`flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium ${
                  selectedView === tab.id
                    ? 'bg-blue-100 text-blue-700'
                    : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
                }`}
              >
                <tab.icon className="h-4 w-4" />
                <span>{tab.name}</span>
              </button>
            ))}
          </nav>
        </div>

        {/* Content */}
        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : (
          <>
            {selectedView === 'overview' && <OverviewTab />}
            {selectedView === 'users' && <UsersTab />}
            {selectedView === 'campaigns' && <CampaignsTab />}
            {selectedView === 'system' && <SystemTab />}
            {selectedView === 'security' && <SecurityTab />}
          </>
        )}
      </div>
    </div>
  );
};

export default AdvancedAdminDashboard;