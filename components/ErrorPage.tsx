import React from 'react';
import { Link } from 'react-router-dom';
import Button from './common/Button';

interface ErrorPageProps {
  title?: string;
  message?: string;
  code?: number;
  showBackButton?: boolean;
}

const ErrorPage: React.FC<ErrorPageProps> = ({
  title = 'Something went wrong',
  message = 'An unexpected error occurred. Please try again later.',
  code = 500,
  showBackButton = true
}) => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-900 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8 text-center">
        <div>
          <h1 className="text-9xl font-extrabold text-red-500">{code}</h1>
          <h2 className="mt-6 text-3xl font-bold text-white">{title}</h2>
          <p className="mt-2 text-sm text-gray-400">{message}</p>
        </div>
        <div className="mt-8 space-y-4">
          {showBackButton && (
            <Button
              variant="primary"
              fullWidth
              onClick={() => window.history.back()}
            >
              Go back
            </Button>
          )}
          <div>
            <Link
              to="/"
              className="text-sm text-primary hover:text-primary/80"
            >
              Return to dashboard
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ErrorPage; 