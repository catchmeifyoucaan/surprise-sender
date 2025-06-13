import React, { useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Sidebar from './Sidebar';
import Navbar from './Navbar';

const Layout: React.FC = () => {
  const { user } = useAuth();
  const location = useLocation();
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  // Don't show layout for auth pages
  if (location.pathname === '/login' || location.pathname === '/register') {
    return <Outlet />;
  }

  return (
    <div className="min-h-screen bg-gray-900 flex">
      <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
      <div className="flex-1 flex flex-col transition-all duration-300">
        <Navbar
          onMenuClick={() => setIsSidebarOpen(!isSidebarOpen)}
          user={user}
        />
        <main className="flex-1 p-4 sm:p-6 lg:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default Layout;
