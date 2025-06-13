
import React, { useState } from 'react';
import { UserIcon, MenuIcon, LogoutIcon } from '../constants';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext'; // Import useAuth

interface HeaderProps {
  setSidebarOpen: (open: boolean) => void;
}

const Header: React.FC<HeaderProps> = ({ setSidebarOpen }) => {
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const navigate = useNavigate();
  const auth = useAuth(); // Get auth context

  const handleLogout = () => {
    auth.logout(); // Call logout from context (activity logged within logout func)
    setUserMenuOpen(false);
    navigate('/login'); // Navigate to login after logout
  };

  const handleProfileClick = () => {
    setUserMenuOpen(false);
    if (auth.user) auth.logUserActivity(auth.user.id, 'Navigated to profile settings.');
    navigate('/settings');
  };

  return (
    <header className="sticky top-0 z-30 flex-shrink-0 flex h-16 bg-primary shadow-md border-b border-slate-700">
      <button
        type="button"
        className="px-4 border-r border-slate-700 text-text-secondary focus:outline-none focus:ring-2 focus:ring-inset focus:ring-accent md:hidden"
        onClick={() => setSidebarOpen(true)}
      >
        <span className="sr-only">Open sidebar</span>
        <MenuIcon className="h-6 w-6" />
      </button>
      <div className="flex-1 px-4 flex justify-between items-center">
        <div className="flex-1 flex">
          {/* Optional: Display user email or name if authenticated */}
          {auth.isAuthenticated && auth.user && (
            <span className="text-sm text-text-secondary hidden md:block">
              Welcome, {auth.user.fullName || auth.user.email}
            </span>
          )}
        </div>
        <div className="ml-4 flex items-center md:ml-6">
          {/* Notification bell placeholder */}
          <button type="button" className="p-1 rounded-full text-text-secondary hover:text-text-primary focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-primary focus:ring-accent">
            <span className="sr-only">View notifications</span>
            <svg className="h-6 w-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
            </svg>
          </button>

          {/* Profile dropdown */}
          {auth.isAuthenticated && (
            <div className="ml-3 relative">
              <div>
                <button 
                  type="button" 
                  className="max-w-xs bg-primary flex items-center text-sm rounded-full focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-primary focus:ring-accent" 
                  id="user-menu-button" 
                  aria-expanded={userMenuOpen}
                  aria-haspopup="true"
                  onClick={() => setUserMenuOpen(!userMenuOpen)}
                >
                  <span className="sr-only">Open user menu</span>
                  <UserIcon className="h-8 w-8 rounded-full text-text-secondary border-2 border-transparent hover:border-accent transition-colors" />
                </button>
              </div>
              {userMenuOpen && (
                <div 
                  className="origin-top-right absolute right-0 mt-2 w-56 rounded-md shadow-lg py-1 bg-secondary ring-1 ring-black ring-opacity-5 focus:outline-none z-40" 
                  role="menu" 
                  aria-orientation="vertical" 
                  aria-labelledby="user-menu-button"
                >
                  {auth.user && (
                    <div className="px-4 py-3 border-b border-slate-700">
                      <p className="text-sm text-text-primary">Signed in as</p>
                      <p className="text-sm font-medium text-accent truncate">{auth.user.email}</p>
                      <p className="text-xs text-text-secondary">Role: {auth.user.role}</p>
                    </div>
                  )}
                  <a href="#" onClick={(e) => { e.preventDefault(); handleProfileClick();}} className="flex items-center px-4 py-2 text-sm text-text-secondary hover:bg-slate-700 hover:text-text-primary" role="menuitem">
                    <UserIcon className="w-4 h-4 mr-2" /> Your Profile
                  </a>
                  <a href="#" onClick={(e) => { e.preventDefault(); handleLogout();}} className="flex items-center px-4 py-2 text-sm text-text-secondary hover:bg-slate-700 hover:text-text-primary" role="menuitem">
                    <LogoutIcon className="w-4 h-4 mr-2" /> Sign out
                  </a>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;
