import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import EmailSender from '../components/EmailSender';
import { EmailData } from '../types';
import { EnvelopeIcon } from '@heroicons/react/24/outline';

const EmailPage: React.FC = () => {
  const { user, logUserActivity } = useAuth();
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const handleSuccess = () => {
    setNotification({ type: 'success', message: 'Email sent successfully!' });
    if (user) {
      logUserActivity(user.id, 'Sent an email');
    }
    // Clear notification after 3 seconds
    setTimeout(() => setNotification(null), 3000);
  };

  const handleError = (error: string) => {
    setNotification({ type: 'error', message: error });
    // Clear notification after 5 seconds
    setTimeout(() => setNotification(null), 5000);
  };

  return (
    <div className="bg-secondary p-4 sm:p-6 rounded-lg shadow-xl min-h-full">
      <h1 className="text-3xl font-bold text-text-primary mb-6 border-b-2 border-accent pb-3 flex items-center">
        <EnvelopeIcon className="w-8 h-8 mr-3 text-accent"/> Send Email
      </h1>

      {notification && (
        <div className={`mb-4 p-4 rounded-md ${
          notification.type === 'success' ? 'bg-green-500/20 text-green-300' : 'bg-red-500/20 text-red-300'
        }`}>
          {notification.message}
        </div>
      )}

      <div className="bg-primary p-4 sm:p-6 rounded-lg shadow-2xl border border-slate-700">
        <EmailSender
          onSuccess={handleSuccess}
          onError={handleError}
        />
      </div>
    </div>
  );
};

export default EmailPage; 