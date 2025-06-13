import React from 'react';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  message?: string;
}

const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({ size = 'md', message }) => {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-8 h-8',
    lg: 'w-12 h-12'
  };

  return (
    <div className="flex flex-col items-center justify-center">
      <div
        className={`
          ${sizeClasses[size]}
          border-4 border-gray-300 border-t-primary
          rounded-full animate-spin
        `}
      />
      {message && (
        <p className="mt-4 text-gray-300 text-center">{message}</p>
      )}
    </div>
  );
};

export default LoadingSpinner;
