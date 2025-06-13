import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import Button from '../components/common/Button';
import { toast } from 'react-hot-toast';
import {
  ChartBarIcon,
  EnvelopeIcon,
  ChatBubbleLeftRightIcon,
  UserGroupIcon,
  ArrowTrendingUpIcon,
  ClockIcon,
  CheckCircleIcon,
  XCircleIcon,
  DocumentTextIcon
} from '@heroicons/react/24/outline';

interface CampaignStats {
  total: number;
  sent: number;
  failed: number;
  pending: number;
  successRate: number;
}

interface DeliveryStats {
  emails: CampaignStats;
  sms: CampaignStats;
  html: CampaignStats;
}

interface ActivityLog {
  id: string;
  type: 'email' | 'sms' | 'html';
  status: 'success' | 'failed' | 'pending';
  recipient: string;
  timestamp: string;
  details: string;
}

const DashboardPage: React.FC = () => {
  const auth = useAuth();
  const [deliveryStats, setDeliveryStats] = useState<DeliveryStats>({
    emails: { total: 0, sent: 0, failed: 0, pending: 0, successRate: 0 },
    sms: { total: 0, sent: 0, failed: 0, pending: 0, successRate: 0 },
    html: { total: 0, sent: 0, failed: 0, pending: 0, successRate: 0 }
  });
  const [recentActivity, setRecentActivity] = useState<ActivityLog[]>([]);
  const [timeRange, setTimeRange] = useState('7d');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (auth.user) {
      auth.logUserActivity(auth.user.id, 'Viewed Dashboard.');
      fetchDashboardData();
    }
  }, [auth.user, timeRange]);

  const fetchDashboardData = async () => {
    setIsLoading(true);
    try {
      const [statsResponse, activityResponse] = await Promise.all([
        fetch(`/api/dashboard/stats?timeRange=${timeRange}`),
        fetch(`/api/dashboard/activity?timeRange=${timeRange}`)
      ]);

      if (!statsResponse.ok || !activityResponse.ok) {
        throw new Error('Failed to fetch dashboard data');
      }

      const [stats, activity] = await Promise.all([
        statsResponse.json(),
        activityResponse.json()
      ]);

      setDeliveryStats(stats);
      setRecentActivity(activity);
    } catch (error) {
      toast.error('Failed to load dashboard data');
    } finally {
      setIsLoading(false);
    }
  };

  const StatCard: React.FC<{
    title: string;
    value: number;
    icon: React.ReactNode;
    trend?: number;
    color: string;
  }> = ({ title, value, icon, trend, color }) => (
    <div className="bg-primary rounded-lg shadow-lg p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-medium text-text-primary">{title}</h3>
        <div className={`p-2 rounded-lg ${color}`}>{icon}</div>
      </div>
      <div className="flex items-end justify-between">
        <div>
          <p className="text-3xl font-bold text-text-primary">{value}</p>
          {trend !== undefined && (
            <p className={`text-sm ${trend >= 0 ? 'text-green-400' : 'text-red-400'}`}>
              {trend >= 0 ? '+' : ''}{trend}% from last period
            </p>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-2xl font-bold text-text-primary">Dashboard</h1>
          <div className="flex items-center space-x-4">
            <select
              value={timeRange}
              onChange={(e) => setTimeRange(e.target.value)}
              className="bg-primary border border-slate-700 rounded-lg px-3 py-2 text-text-primary"
            >
              <option value="24h">Last 24 Hours</option>
              <option value="7d">Last 7 Days</option>
              <option value="30d">Last 30 Days</option>
              <option value="90d">Last 90 Days</option>
            </select>
            <Button
              variant="secondary"
              onClick={fetchDashboardData}
              disabled={isLoading}
            >
              Refresh
            </Button>
          </div>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <StatCard
            title="Total Campaigns"
            value={deliveryStats.emails.total + deliveryStats.sms.total + deliveryStats.html.total}
            icon={<ChartBarIcon className="w-6 h-6 text-blue-400" />}
            trend={5}
            color="bg-blue-500/20"
          />
          <StatCard
            title="Success Rate"
            value={Math.round(
              (deliveryStats.emails.successRate + deliveryStats.sms.successRate + deliveryStats.html.successRate) / 3
            )}
            icon={<ArrowTrendingUpIcon className="w-6 h-6 text-green-400" />}
            trend={2}
            color="bg-green-500/20"
          />
          <StatCard
            title="Active Users"
            value={42}
            icon={<UserGroupIcon className="w-6 h-6 text-purple-400" />}
            trend={8}
            color="bg-purple-500/20"
          />
          <StatCard
            title="Pending Tasks"
            value={deliveryStats.emails.pending + deliveryStats.sms.pending + deliveryStats.html.pending}
            icon={<ClockIcon className="w-6 h-6 text-yellow-400" />}
            color="bg-yellow-500/20"
          />
        </div>

        <div className="grid grid-cols-12 gap-6">
          {/* Campaign Performance */}
          <div className="col-span-8">
            <div className="bg-primary rounded-lg shadow-lg p-6">
              <h2 className="text-xl font-semibold text-text-primary mb-6">
                Campaign Performance
              </h2>
              <div className="space-y-6">
                {/* Email Campaigns */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center">
                      <EnvelopeIcon className="w-5 h-5 text-blue-400 mr-2" />
                      <h3 className="text-lg font-medium text-text-primary">Email Campaigns</h3>
                    </div>
                    <span className="text-sm text-text-secondary">
                      Success Rate: {deliveryStats.emails.successRate}%
                    </span>
                  </div>
                  <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-blue-400 rounded-full"
                      style={{ width: `${deliveryStats.emails.successRate}%` }}
                    />
                  </div>
                  <div className="flex justify-between mt-2 text-sm text-text-secondary">
                    <span>Sent: {deliveryStats.emails.sent}</span>
                    <span>Failed: {deliveryStats.emails.failed}</span>
                    <span>Pending: {deliveryStats.emails.pending}</span>
                  </div>
                </div>

                {/* SMS Campaigns */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center">
                      <ChatBubbleLeftRightIcon className="w-5 h-5 text-green-400 mr-2" />
                      <h3 className="text-lg font-medium text-text-primary">SMS Campaigns</h3>
                    </div>
                    <span className="text-sm text-text-secondary">
                      Success Rate: {deliveryStats.sms.successRate}%
                    </span>
                  </div>
                  <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-green-400 rounded-full"
                      style={{ width: `${deliveryStats.sms.successRate}%` }}
                    />
                  </div>
                  <div className="flex justify-between mt-2 text-sm text-text-secondary">
                    <span>Sent: {deliveryStats.sms.sent}</span>
                    <span>Failed: {deliveryStats.sms.failed}</span>
                    <span>Pending: {deliveryStats.sms.pending}</span>
                  </div>
                </div>

                {/* HTML Campaigns */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center">
                      <DocumentTextIcon className="w-5 h-5 text-purple-400 mr-2" />
                      <h3 className="text-lg font-medium text-text-primary">HTML Campaigns</h3>
                    </div>
                    <span className="text-sm text-text-secondary">
                      Success Rate: {deliveryStats.html.successRate}%
                    </span>
                  </div>
                  <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-purple-400 rounded-full"
                      style={{ width: `${deliveryStats.html.successRate}%` }}
                    />
                  </div>
                  <div className="flex justify-between mt-2 text-sm text-text-secondary">
                    <span>Sent: {deliveryStats.html.sent}</span>
                    <span>Failed: {deliveryStats.html.failed}</span>
                    <span>Pending: {deliveryStats.html.pending}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Recent Activity */}
          <div className="col-span-4">
            <div className="bg-primary rounded-lg shadow-lg p-6">
              <h2 className="text-xl font-semibold text-text-primary mb-6">
                Recent Activity
              </h2>
              <div className="space-y-4">
                {recentActivity.map(activity => (
                  <div
                    key={activity.id}
                    className="bg-slate-800/50 rounded-lg p-4 border border-slate-700"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-text-secondary">
                        {new Date(activity.timestamp).toLocaleString()}
                      </span>
                      {activity.status === 'success' ? (
                        <CheckCircleIcon className="w-5 h-5 text-green-400" />
                      ) : activity.status === 'failed' ? (
                        <XCircleIcon className="w-5 h-5 text-red-400" />
                      ) : (
                        <ClockIcon className="w-5 h-5 text-yellow-400" />
                      )}
                    </div>
                    <p className="text-text-primary mb-1">{activity.details}</p>
                    <p className="text-sm text-text-secondary">{activity.recipient}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;
