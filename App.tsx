import React from 'react';
import { BrowserRouter, Routes, Route, Outlet, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import DashboardPage from './pages/DashboardPage';
import ComposePage from './pages/ComposePage';
import TrackingPage from './pages/TrackingPage';
import SettingsPage from './pages/SettingsPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import BulkEmailPage from './pages/BulkEmailPage';
import BulkSmsPage from './pages/BulkSmsPage';
import AdminUsersPage from './pages/AdminUsersPage';
import AgentsPage from './pages/AgentsPage';
import HtmlBulkSenderPage from './pages/HtmlBulkSenderPage';
import SupportPage from './pages/SupportPage';
import EmailPage from './pages/EmailPage';
import UserManagementPage from './pages/UserManagementPage';
import { useAuth } from './context/AuthContext';
import LoadingSpinner from './components/common/LoadingSpinner';

const ProtectedRoutes: React.FC = () => {
  const auth = useAuth();
  if (auth.isLoading) {
    return <div className="flex h-screen items-center justify-center bg-primary"><LoadingSpinner message="Authenticating..." size="lg"/></div>;
  }
  if (!auth.isAuthenticated) {
    auth.logUserActivity('guest', 'Attempted to access protected route while unauthenticated.');
    return <Navigate to="/login" replace />;
  }
  return <Layout />;
};

const PublicRoutes: React.FC = () => {
  const auth = useAuth();
   if (auth.isLoading) {
    return <div className="flex h-screen items-center justify-center bg-primary"><LoadingSpinner message="Loading..." size="lg"/></div>;
  }
  if (auth.isAuthenticated) {
    return <Navigate to="/" replace />;
  }
  return <Outlet />; // Render login/register if not authenticated
};

const App: React.FC = () => {
  const auth = useAuth(); 

  return (
    <BrowserRouter>
      <Routes>
        {/* Public routes like login and register */}
        <Route element={<PublicRoutes />}>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        </Route>

        {/* Application routes (protected for standard users) */}
        <Route element={<ProtectedRoutes />}>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/compose" element={<ComposePage />} />
          <Route path="/email" element={<EmailPage />} />
          <Route path="/agents" element={<AgentsPage />} />
          <Route path="/html-bulk-sender" element={<HtmlBulkSenderPage />} />
          <Route path="/bulk-email" element={<BulkEmailPage />} />
          <Route path="/bulk-sms" element={<BulkSmsPage />} />
          <Route path="/tracking" element={<TrackingPage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="/support" element={<SupportPage />} />
          <Route path="/users" element={<UserManagementPage />} />
          <Route path="/admin-users" element={<AdminUsersPage />} />
        </Route>
        
        {/* Fallback Route Handling */}
        <Route 
          path="*" 
          element={
            auth.isLoading ? <div className="flex h-screen items-center justify-center bg-primary"><LoadingSpinner size="lg"/></div> : 
            auth.isAuthenticated ? <Navigate to="/" replace /> : <Navigate to="/login" replace />
          } 
        />
      </Routes>
    </BrowserRouter>
  );
};

export default App;
