import React from 'react';
import { APP_NAME } from '../../constants';

interface AuthLayoutProps {
  children: React.ReactNode;
  title: string;
}

const AuthLayout: React.FC<AuthLayoutProps> = ({ children, title }) => {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-primary via-slate-900 to-indigo-950 p-4">
      <div className="flex items-center mb-8">
        <div className="h-10 w-10 bg-accent rounded-full animate-pulse-fast mr-3"></div>
        <h1 className="text-3xl font-bold text-text-primary">{APP_NAME}</h1>
      </div>
      <div className="w-full max-w-md bg-secondary p-8 rounded-xl shadow-2xl border border-slate-700">
        <h2 className="text-2xl font-semibold text-accent mb-6 text-center">{title}</h2>
        {children}
      </div>
      <p className="mt-8 text-sm text-text-secondary text-center">
        &copy; {new Date().getFullYear()} {APP_NAME}. All rights reserved.
      </p>
    </div>
  );
};

export default AuthLayout;
