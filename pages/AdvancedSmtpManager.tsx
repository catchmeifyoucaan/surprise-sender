import React from 'react';
import { useAuth } from '../context/AuthContext';
import SmtpTab from './settings/SmtpTab';

const AdvancedSmtpManager: React.FC = () => {
  const auth = useAuth();

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
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <SmtpTab setSettingsError={() => {}} />
        </div>
      </div>
    </div>
  );
};

export default AdvancedSmtpManager;