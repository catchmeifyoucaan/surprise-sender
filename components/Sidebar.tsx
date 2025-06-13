import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  HomeIcon,
  EnvelopeIcon,
  ChatBubbleLeftRightIcon,
  Cog6ToothIcon,
  UserGroupIcon,
  ChartBarIcon,
  QuestionMarkCircleIcon,
  UsersIcon,
  ShieldCheckIcon,
  DocumentTextIcon
} from '@heroicons/react/24/outline';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

const navigation = [
  { name: 'Dashboard', href: '/', icon: HomeIcon },
  { name: 'Compose', href: '/compose', icon: EnvelopeIcon },
  { name: 'Bulk Email', href: '/bulk-email', icon: ChatBubbleLeftRightIcon },
  { name: 'Bulk SMS', href: '/bulk-sms', icon: ChatBubbleLeftRightIcon },
  { name: 'HTML Bulk Sender', href: '/html-bulk-sender', icon: DocumentTextIcon },
  { name: 'Agents', href: '/agents', icon: UserGroupIcon },
  { name: 'User Management', href: '/users', icon: UsersIcon },
  { name: 'Admin Users', href: '/admin-users', icon: ShieldCheckIcon },
  { name: 'Tracking', href: '/tracking', icon: ChartBarIcon },
  { name: 'Settings', href: '/settings', icon: Cog6ToothIcon },
  { name: 'Support', href: '/support', icon: QuestionMarkCircleIcon }
];

const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose }) => {
  const location = useLocation();

  return (
    <>
      {/* Mobile backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-gray-900 bg-opacity-75 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <div
        className={`
          fixed inset-y-0 left-0 z-50 w-64 bg-gray-800 transform transition-transform duration-300 ease-in-out
          ${isOpen ? 'translate-x-0' : '-translate-x-full'}
          lg:translate-x-0 lg:static lg:inset-0
        `}
      >
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="flex items-center justify-center h-16 px-4 bg-gray-900">
            <Link to="/" className="text-xl font-bold text-white">
              Surprise Sender
            </Link>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-2 py-4 space-y-1 overflow-y-auto">
            {navigation.map((item) => {
              const isActive = location.pathname === item.href;
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  className={`
                    flex items-center px-2 py-2 text-sm font-medium rounded-md
                    ${
                      isActive
                        ? 'bg-gray-900 text-white'
                        : 'text-gray-300 hover:bg-gray-700 hover:text-white'
                    }
                  `}
                >
                  <item.icon
                    className={`
                      mr-3 h-6 w-6
                      ${isActive ? 'text-white' : 'text-gray-400'}
                    `}
                    aria-hidden="true"
                  />
                  {item.name}
                </Link>
              );
            })}
          </nav>

          {/* Footer */}
          <div className="p-4 border-t border-gray-700">
            <div className="text-xs text-gray-400">
              © 2024 Surprise Sender. All rights reserved.
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default Sidebar;