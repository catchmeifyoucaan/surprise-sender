import React from 'react';
import LoadingSpinner from './common/LoadingSpinner';

interface LoadingPageProps {
  message?: string;
}

const LoadingPage: React.FC<LoadingPageProps> = ({
  message = 'Loading...'
}) => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-900">
      <div className="text-center">
        <LoadingSpinner size="lg" message={message} />
      </div>
    </div>
  );
};

export default LoadingPage; 