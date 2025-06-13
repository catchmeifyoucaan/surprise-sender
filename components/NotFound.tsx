import React from 'react';
import { Link } from 'react-router-dom';
import Button from './common/Button';

const NotFound: React.FC = () => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-900 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8 text-center">
        <div>
          <h1 className="text-9xl font-extrabold text-primary">404</h1>
          <h2 className="mt-6 text-3xl font-bold text-white">
            Page not found
          </h2>
          <p className="mt-2 text-sm text-gray-400">
            Sorry, we couldn't find the page you're looking for.
          </p>
        </div>
        <div className="mt-8">
          <Button
            variant="primary"
            fullWidth
            onClick={() => window.history.back()}
          >
            Go back
          </Button>
          <div className="mt-4">
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

export default NotFound; 