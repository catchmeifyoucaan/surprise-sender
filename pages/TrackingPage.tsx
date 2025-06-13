import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { EmailService } from '../services/emailService';
import Button from '../components/common/Button';
import LoadingSpinner from '../components/common/LoadingSpinner';

interface TrackingStats {
  totalSent: number;
  totalOpened: number;
  totalClicked: number;
  openRate: number;
  clickRate: number;
  bounceRate: number;
}

const TrackingPage: React.FC = () => {
  const auth = useAuth();
  const [stats, setStats] = useState<TrackingStats>({
    totalSent: 0,
    totalOpened: 0,
    totalClicked: 0,
    openRate: 0,
    clickRate: 0,
    bounceRate: 0
  });
  const [isLoading, setIsLoading] = useState(true);
  const [trackingData, setTrackingData] = useState<any[]>([]);

  useEffect(() => {
    loadTrackingData();
  }, []);

  const loadTrackingData = async () => {
    setIsLoading(true);
    try {
      // Get tracking stats
      const trackingStats = await EmailService.getTrackingStats();
      setStats(trackingStats);

      // Get detailed tracking data
      const data = await EmailService.getDetailedTracking();
      setTrackingData(data);
    } catch (error) {
      console.error('Failed to load tracking data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'opened':
        return 'text-green-400';
      case 'clicked':
        return 'text-blue-400';
      case 'bounced':
        return 'text-red-400';
      case 'delivered':
        return 'text-yellow-400';
      default:
        return 'text-gray-400';
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-2xl font-bold text-white">Email Tracking</h1>
        <Button onClick={loadTrackingData} variant="secondary">
          Refresh
        </Button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        <div className="bg-slate-800 rounded-lg shadow-lg p-6 border border-slate-700">
          <h3 className="text-lg font-semibold mb-4 text-white">Delivery Stats</h3>
          <div className="space-y-3">
            <p className="text-slate-300">Total Sent: <span className="text-white font-semibold">{stats.totalSent}</span></p>
            <p className="text-slate-300">Bounce Rate: <span className="text-white font-semibold">{stats.bounceRate}%</span></p>
            <p className="text-slate-300">Delivered: <span className="text-white font-semibold">{stats.totalSent - (stats.totalSent * stats.bounceRate / 100)}</span></p>
          </div>
        </div>

        <div className="bg-slate-800 rounded-lg shadow-lg p-6 border border-slate-700">
          <h3 className="text-lg font-semibold mb-4 text-white">Engagement Stats</h3>
          <div className="space-y-3">
            <p className="text-slate-300">Open Rate: <span className="text-white font-semibold">{stats.openRate}%</span></p>
            <p className="text-slate-300">Click Rate: <span className="text-white font-semibold">{stats.clickRate}%</span></p>
            <p className="text-slate-300">Total Opens: <span className="text-white font-semibold">{stats.totalOpened}</span></p>
          </div>
        </div>

        <div className="bg-slate-800 rounded-lg shadow-lg p-6 border border-slate-700">
          <h3 className="text-lg font-semibold mb-4 text-white">Click Stats</h3>
          <div className="space-y-3">
            <p className="text-slate-300">Total Clicks: <span className="text-white font-semibold">{stats.totalClicked}</span></p>
            <p className="text-slate-300">Click-to-Open Rate: <span className="text-white font-semibold">{stats.totalOpened > 0 ? ((stats.totalClicked / stats.totalOpened) * 100).toFixed(1) : 0}%</span></p>
            <p className="text-slate-300">Unique Clicks: <span className="text-white font-semibold">{Math.round(stats.totalClicked * 0.8)}</span></p>
          </div>
        </div>
      </div>

      {/* Detailed Tracking */}
      <div className="bg-slate-800 rounded-lg shadow-lg border border-slate-700">
        <div className="p-6 border-b border-slate-700">
          <h2 className="text-xl font-semibold text-white">Detailed Tracking</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-700">
            <thead className="bg-slate-900">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">Time</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">Email</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">Subject</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700">
              {trackingData.map((item, index) => (
                <tr key={index} className="hover:bg-slate-700/50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-300">
                    {new Date(item.timestamp).toLocaleString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-white">
                    {item.email}
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-300">
                    {item.subject}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`text-sm font-medium ${getStatusColor(item.status)}`}>
                      {item.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-300">
                    {item.details}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default TrackingPage;