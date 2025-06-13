
import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import AuthLayout from '../components/auth/AuthLayout';
import Input from '../components/common/Input';
import Button from '../components/common/Button';
import { KeyIcon } from '../constants';
import { useAuth } from '../context/AuthContext';

const ForgotPasswordPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState('');
  const auth = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setMessage('');

    if (!email.includes('@') || !email.includes('.')) {
        setMessage('Please enter a valid email address.');
        setIsLoading(false);
        return;
    }

    // Simulate API call for password reset
    setTimeout(() => {
      setMessage(`If an account with the email ${email} exists, a password reset link has been sent. (Mock)`);
      auth.logUserActivity('guest-forgot-password', `Password reset attempted for email: ${email}`);
      setIsLoading(false);
    }, 1500);
  };

  return (
    <AuthLayout title="Forgot Your Password?">
      <form onSubmit={handleSubmit} className="space-y-6">
        <p className="text-sm text-text-secondary text-center">
          Enter your email address below and we'll send you a link to reset your password (this is a mock process).
        </p>
        {message && (
          <p className={`text-sm p-3 rounded-md text-center ${message.includes('valid email') ? 'bg-red-900/50 text-red-300' : 'bg-sky-900/50 text-sky-200'}`}>
            {message}
          </p>
        )}
        <Input
          label="Email Address"
          id="email"
          name="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          required
          autoComplete="email"
          disabled={isLoading}
        />
        <div>
          <Button type="submit" variant="primary" className="w-full" isLoading={isLoading} leftIcon={<KeyIcon className="w-5 h-5"/>}>
            Send Reset Link
          </Button>
        </div>
      </form>
      <p className="mt-6 text-center text-sm text-text-secondary">
        Remember your password?{' '}
        <Link to="/login" className="font-medium text-accent hover:text-sky-400">
          Sign In
        </Link>
      </p>
    </AuthLayout>
  );
};

export default ForgotPasswordPage;
