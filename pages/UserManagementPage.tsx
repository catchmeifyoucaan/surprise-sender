import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Input, Button, Select, Modal, Tabs, Badge } from '../components/common';
import { toast } from 'react-hot-toast';
import {
  UserPlusIcon,
  UserGroupIcon,
  ShieldCheckIcon,
  ClockIcon,
  TrashIcon,
  PencilIcon,
  CheckIcon,
  XMarkIcon,
  KeyIcon,
  BellIcon,
  GlobeAltIcon,
  LockClosedIcon
} from '@heroicons/react/24/outline';

interface User {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'manager' | 'user' | 'viewer';
  status: 'active' | 'inactive' | 'suspended' | 'pending';
  lastLogin?: string;
  createdAt: string;
  emailVerified: boolean;
  twoFactorEnabled: boolean;
  preferences?: {
    theme: 'light' | 'dark' | 'system';
    language: string;
    timezone: string;
    notifications: {
      email: boolean;
      sms: boolean;
      desktop: boolean;
    };
  };
  permissions?: {
    canManageUsers: boolean;
    canManageSettings: boolean;
    canSendEmails: boolean;
    canSendSMS: boolean;
    canViewReports: boolean;
    canManageTemplates: boolean;
    canManageCampaigns: boolean;
  };
  securitySettings?: {
    sessionTimeout: number;
    passwordExpiry: number;
    maxLoginAttempts: number;
    requireTwoFactor: boolean;
    allowedIPs: string[];
    restrictedIPs: string[];
  };
}

interface UserActivity {
  id: string;
  userId: string;
  action: string;
  timestamp: string;
  details: string;
  ip: string;
  userAgent: string;
}

const UserManagementPage: React.FC = () => {
  const auth = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [activities, setActivities] = useState<UserActivity[]>([]);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('details');

  useEffect(() => {
    if (auth.user) {
      auth.logUserActivity(auth.user.id, 'Viewed User Management Page.');
      fetchUsers();
      fetchActivities();
    }
  }, [auth]);

  const fetchUsers = async () => {
    try {
      const response = await fetch('/api/users');
      if (!response.ok) throw new Error('Failed to fetch users');
      const data = await response.json();
      setUsers(data);
    } catch (error) {
      toast.error('Failed to load users');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchActivities = async () => {
    try {
      const response = await fetch('/api/users/activities');
      if (!response.ok) throw new Error('Failed to fetch activities');
      const data = await response.json();
      setActivities(data);
    } catch (error) {
      toast.error('Failed to load user activities');
    }
  };

  const handleUserUpdate = async (userId: string, updates: Partial<User>) => {
    try {
      const response = await fetch(`/api/users/${userId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      });

      if (!response.ok) throw new Error('Failed to update user');

      toast.success('User updated successfully');
      fetchUsers();
      setIsEditing(false);
    } catch (error) {
      toast.error('Failed to update user');
    }
  };

  const handleUserDelete = async (userId: string) => {
    if (!window.confirm('Are you sure you want to delete this user?')) return;

    try {
      const response = await fetch(`/api/users/${userId}`, {
        method: 'DELETE'
      });

      if (!response.ok) throw new Error('Failed to delete user');

      toast.success('User deleted successfully');
      fetchUsers();
      setSelectedUser(null);
    } catch (error) {
      toast.error('Failed to delete user');
    }
  };

  const handleUserCreate = async (userData: Partial<User>) => {
    try {
      const response = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(userData)
      });

      if (!response.ok) throw new Error('Failed to create user');

      toast.success('User created successfully');
      fetchUsers();
      setIsCreating(false);
    } catch (error) {
      toast.error('Failed to create user');
    }
  };

  const handleResetPassword = async (userId: string) => {
    try {
      const response = await fetch(`/api/users/${userId}/reset-password`, {
        method: 'POST'
      });

      if (!response.ok) throw new Error('Failed to reset password');

      toast.success('Password reset email sent successfully');
    } catch (error) {
      toast.error('Failed to reset password');
    }
  };

  const handleToggleTwoFactor = async (userId: string, enable: boolean) => {
    try {
      const response = await fetch(`/api/users/${userId}/two-factor`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enable })
      });

      if (!response.ok) throw new Error('Failed to update two-factor authentication');

      toast.success(`Two-factor authentication ${enable ? 'enabled' : 'disabled'} successfully`);
      fetchUsers();
    } catch (error) {
      toast.error('Failed to update two-factor authentication');
    }
  };

  const filteredUsers = users.filter(user => {
    const matchesSearch = user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         user.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesRole = roleFilter === 'all' || user.role === roleFilter;
    const matchesStatus = statusFilter === 'all' || user.status === statusFilter;
    return matchesSearch && matchesRole && matchesStatus;
  });

  const renderUserDetails = () => {
    if (!selectedUser) return null;

    const defaultPreferences = {
      theme: 'system' as const,
      language: 'en',
      timezone: 'UTC',
      notifications: {
        email: true,
        sms: false,
        desktop: true
      }
    };

    const defaultPermissions = {
      canManageUsers: false,
      canManageSettings: false,
      canSendEmails: false,
      canSendSMS: false,
      canViewReports: false,
      canManageTemplates: false,
      canManageCampaigns: false
    };

    return (
      <div className="space-y-6">
        <Tabs
          tabs={[
            { id: 'details', label: 'Details', icon: UserGroupIcon },
            { id: 'security', label: 'Security', icon: ShieldCheckIcon },
            { id: 'preferences', label: 'Preferences', icon: BellIcon },
            { id: 'permissions', label: 'Permissions', icon: LockClosedIcon },
            { id: 'activity', label: 'Activity', icon: ClockIcon }
          ]}
          activeTab={activeTab}
          onChange={setActiveTab}
        />

        {activeTab === 'details' && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-text-secondary">Name</label>
                <Input
                  value={selectedUser.name}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSelectedUser({ ...selectedUser, name: e.target.value })}
                  disabled={!isEditing}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-text-secondary">Email</label>
                <Input
                  value={selectedUser.email}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSelectedUser({ ...selectedUser, email: e.target.value })}
                  disabled={!isEditing}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-text-secondary">Role</label>
                <Select
                  value={selectedUser.role}
                  onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setSelectedUser({ ...selectedUser, role: e.target.value as User['role'] })}
                  disabled={!isEditing}
                  options={[
                    { value: 'admin', label: 'Admin' },
                    { value: 'manager', label: 'Manager' },
                    { value: 'user', label: 'User' },
                    { value: 'viewer', label: 'Viewer' }
                  ]}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-text-secondary">Status</label>
                <Select
                  value={selectedUser.status}
                  onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setSelectedUser({ ...selectedUser, status: e.target.value as User['status'] })}
                  disabled={!isEditing}
                  options={[
                    { value: 'active', label: 'Active' },
                    { value: 'inactive', label: 'Inactive' },
                    { value: 'suspended', label: 'Suspended' },
                    { value: 'pending', label: 'Pending' }
                  ]}
                />
              </div>
            </div>
          </div>
        )}

        {activeTab === 'security' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-medium text-text-primary">Two-Factor Authentication</h3>
                <p className="text-sm text-text-secondary">Add an extra layer of security to your account</p>
              </div>
              <Button
                variant={selectedUser.twoFactorEnabled ? 'danger' : 'primary'}
                onClick={(e: React.MouseEvent<HTMLButtonElement>) => {
                  e.preventDefault();
                  handleToggleTwoFactor(selectedUser.id, !selectedUser.twoFactorEnabled);
                }}
              >
                {selectedUser.twoFactorEnabled ? 'Disable 2FA' : 'Enable 2FA'}
              </Button>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-medium text-text-primary">Password</h3>
                <p className="text-sm text-text-secondary">Reset the user's password</p>
              </div>
              <Button
                variant="secondary"
                onClick={(e: React.MouseEvent<HTMLButtonElement>) => {
                  e.preventDefault();
                  handleResetPassword(selectedUser.id);
                }}
              >
                Reset Password
              </Button>
            </div>

            {selectedUser.securitySettings && (
              <div className="space-y-4">
                <h3 className="text-lg font-medium text-text-primary">Security Settings</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-text-secondary">Session Timeout (minutes)</label>
                    <Input
                      type="number"
                      value={selectedUser.securitySettings.sessionTimeout || 30}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSelectedUser({
                        ...selectedUser,
                        securitySettings: {
                          ...selectedUser.securitySettings,
                          sessionTimeout: parseInt(e.target.value),
                          passwordExpiry: selectedUser.securitySettings?.passwordExpiry || 90,
                          maxLoginAttempts: selectedUser.securitySettings?.maxLoginAttempts || 5,
                          requireTwoFactor: selectedUser.securitySettings?.requireTwoFactor || false,
                          allowedIPs: selectedUser.securitySettings?.allowedIPs || [],
                          restrictedIPs: selectedUser.securitySettings?.restrictedIPs || []
                        }
                      })}
                      disabled={!isEditing}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-text-secondary">Password Expiry (days)</label>
                    <Input
                      type="number"
                      value={selectedUser.securitySettings.passwordExpiry || 90}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSelectedUser({
                        ...selectedUser,
                        securitySettings: {
                          ...selectedUser.securitySettings,
                          sessionTimeout: selectedUser.securitySettings?.sessionTimeout || 30,
                          passwordExpiry: parseInt(e.target.value),
                          maxLoginAttempts: selectedUser.securitySettings?.maxLoginAttempts || 5,
                          requireTwoFactor: selectedUser.securitySettings?.requireTwoFactor || false,
                          allowedIPs: selectedUser.securitySettings?.allowedIPs || [],
                          restrictedIPs: selectedUser.securitySettings?.restrictedIPs || []
                        }
                      })}
                      disabled={!isEditing}
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'preferences' && selectedUser.preferences && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-text-secondary">Theme</label>
                <Select
                  value={selectedUser.preferences.theme || defaultPreferences.theme}
                  onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setSelectedUser({
                    ...selectedUser,
                    preferences: {
                      ...defaultPreferences,
                      ...selectedUser.preferences,
                      theme: e.target.value as 'light' | 'dark' | 'system'
                    }
                  })}
                  disabled={!isEditing}
                  options={[
                    { value: 'light', label: 'Light' },
                    { value: 'dark', label: 'Dark' },
                    { value: 'system', label: 'System' }
                  ]}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-text-secondary">Language</label>
                <Select
                  value={selectedUser.preferences.language || defaultPreferences.language}
                  onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setSelectedUser({
                    ...selectedUser,
                    preferences: {
                      ...defaultPreferences,
                      ...selectedUser.preferences,
                      language: e.target.value
                    }
                  })}
                  disabled={!isEditing}
                  options={[
                    { value: 'en', label: 'English' },
                    { value: 'es', label: 'Spanish' },
                    { value: 'fr', label: 'French' }
                  ]}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-text-secondary">Timezone</label>
                <Select
                  value={selectedUser.preferences.timezone || defaultPreferences.timezone}
                  onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setSelectedUser({
                    ...selectedUser,
                    preferences: {
                      ...defaultPreferences,
                      ...selectedUser.preferences,
                      timezone: e.target.value
                    }
                  })}
                  disabled={!isEditing}
                  options={[
                    { value: 'UTC', label: 'UTC' },
                    { value: 'EST', label: 'Eastern Time' },
                    { value: 'PST', label: 'Pacific Time' }
                  ]}
                />
              </div>
            </div>

            <div className="space-y-2">
              <h3 className="text-lg font-medium text-text-primary">Notifications</h3>
              <div className="space-y-2">
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={selectedUser.preferences.notifications.email ?? defaultPreferences.notifications.email}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSelectedUser({
                      ...selectedUser,
                      preferences: {
                        ...defaultPreferences,
                        ...selectedUser.preferences,
                        notifications: {
                          ...defaultPreferences.notifications,
                          ...selectedUser.preferences?.notifications,
                          email: e.target.checked
                        }
                      }
                    })}
                    disabled={!isEditing}
                    className="form-checkbox"
                  />
                  <span className="text-text-primary">Email Notifications</span>
                </label>
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={selectedUser.preferences.notifications.sms ?? defaultPreferences.notifications.sms}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSelectedUser({
                      ...selectedUser,
                      preferences: {
                        ...defaultPreferences,
                        ...selectedUser.preferences,
                        notifications: {
                          ...defaultPreferences.notifications,
                          ...selectedUser.preferences?.notifications,
                          sms: e.target.checked
                        }
                      }
                    })}
                    disabled={!isEditing}
                    className="form-checkbox"
                  />
                  <span className="text-text-primary">SMS Notifications</span>
                </label>
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={selectedUser.preferences.notifications.desktop ?? defaultPreferences.notifications.desktop}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSelectedUser({
                      ...selectedUser,
                      preferences: {
                        ...defaultPreferences,
                        ...selectedUser.preferences,
                        notifications: {
                          ...defaultPreferences.notifications,
                          ...selectedUser.preferences?.notifications,
                          desktop: e.target.checked
                        }
                      }
                    })}
                    disabled={!isEditing}
                    className="form-checkbox"
                  />
                  <span className="text-text-primary">Desktop Notifications</span>
                </label>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'permissions' && selectedUser.permissions && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={selectedUser.permissions.canManageUsers ?? defaultPermissions.canManageUsers}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSelectedUser({
                    ...selectedUser,
                    permissions: {
                      ...defaultPermissions,
                      ...selectedUser.permissions,
                      canManageUsers: e.target.checked
                    }
                  })}
                  disabled={!isEditing}
                  className="form-checkbox"
                />
                <span className="text-text-primary">Manage Users</span>
              </label>
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={selectedUser.permissions.canManageSettings ?? defaultPermissions.canManageSettings}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSelectedUser({
                    ...selectedUser,
                    permissions: {
                      ...defaultPermissions,
                      ...selectedUser.permissions,
                      canManageSettings: e.target.checked
                    }
                  })}
                  disabled={!isEditing}
                  className="form-checkbox"
                />
                <span className="text-text-primary">Manage Settings</span>
              </label>
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={selectedUser.permissions.canSendEmails ?? defaultPermissions.canSendEmails}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSelectedUser({
                    ...selectedUser,
                    permissions: {
                      ...defaultPermissions,
                      ...selectedUser.permissions,
                      canSendEmails: e.target.checked
                    }
                  })}
                  disabled={!isEditing}
                  className="form-checkbox"
                />
                <span className="text-text-primary">Send Emails</span>
              </label>
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={selectedUser.permissions.canSendSMS ?? defaultPermissions.canSendSMS}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSelectedUser({
                    ...selectedUser,
                    permissions: {
                      ...defaultPermissions,
                      ...selectedUser.permissions,
                      canSendSMS: e.target.checked
                    }
                  })}
                  disabled={!isEditing}
                  className="form-checkbox"
                />
                <span className="text-text-primary">Send SMS</span>
              </label>
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={selectedUser.permissions.canViewReports ?? defaultPermissions.canViewReports}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSelectedUser({
                    ...selectedUser,
                    permissions: {
                      ...defaultPermissions,
                      ...selectedUser.permissions,
                      canViewReports: e.target.checked
                    }
                  })}
                  disabled={!isEditing}
                  className="form-checkbox"
                />
                <span className="text-text-primary">View Reports</span>
              </label>
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={selectedUser.permissions.canManageTemplates ?? defaultPermissions.canManageTemplates}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSelectedUser({
                    ...selectedUser,
                    permissions: {
                      ...defaultPermissions,
                      ...selectedUser.permissions,
                      canManageTemplates: e.target.checked
                    }
                  })}
                  disabled={!isEditing}
                  className="form-checkbox"
                />
                <span className="text-text-primary">Manage Templates</span>
              </label>
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={selectedUser.permissions.canManageCampaigns ?? defaultPermissions.canManageCampaigns}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSelectedUser({
                    ...selectedUser,
                    permissions: {
                      ...defaultPermissions,
                      ...selectedUser.permissions,
                      canManageCampaigns: e.target.checked
                    }
                  })}
                  disabled={!isEditing}
                  className="form-checkbox"
                />
                <span className="text-text-primary">Manage Campaigns</span>
              </label>
            </div>
          </div>
        )}

        {activeTab === 'activity' && (
          <div className="space-y-4">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="text-left border-b border-slate-700">
                    <th className="pb-3 text-text-secondary">Action</th>
                    <th className="pb-3 text-text-secondary">Timestamp</th>
                    <th className="pb-3 text-text-secondary">IP Address</th>
                    <th className="pb-3 text-text-secondary">Details</th>
                  </tr>
                </thead>
                <tbody>
                  {activities
                    .filter(activity => activity.userId === selectedUser.id)
                    .map(activity => (
                      <tr key={activity.id} className="border-b border-slate-700">
                        <td className="py-3 text-text-primary">{activity.action}</td>
                        <td className="py-3 text-text-secondary">
                          {new Date(activity.timestamp).toLocaleString()}
                        </td>
                        <td className="py-3 text-text-secondary">{activity.ip}</td>
                        <td className="py-3 text-text-secondary">{activity.details}</td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        <div className="flex justify-end space-x-4 mt-6">
          {isEditing ? (
            <>
              <Button
                variant="secondary"
                onClick={(e: React.MouseEvent<HTMLButtonElement>) => {
                  e.preventDefault();
                  setIsEditing(false);
                  setSelectedUser(users.find(u => u.id === selectedUser.id) || null);
                }}
              >
                Cancel
              </Button>
              <Button
                onClick={(e: React.MouseEvent<HTMLButtonElement>) => {
                  e.preventDefault();
                  handleUserUpdate(selectedUser.id, selectedUser);
                }}
                variant="primary"
              >
                Save Changes
              </Button>
            </>
          ) : (
            <>
              <Button
                onClick={(e: React.MouseEvent<HTMLButtonElement>) => {
                  e.preventDefault();
                  handleUserDelete(selectedUser.id);
                }}
                variant="danger"
              >
                Delete User
              </Button>
              <Button
                variant="primary"
                onClick={() => setIsEditing(true)}
              >
                Edit User
              </Button>
            </>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-2xl font-bold text-text-primary flex items-center">
            <UserGroupIcon className="w-8 h-8 mr-3 text-accent" />
            User Management
          </h1>
          <Button
            variant="primary"
            onClick={() => setIsCreating(true)}
          >
            <UserPlusIcon className="w-5 h-5 mr-2" />
            Add User
          </Button>
        </div>

        <div className="grid grid-cols-12 gap-6">
          {/* User List */}
          <div className="col-span-8">
            <div className="bg-primary rounded-lg shadow-lg p-6">
              <div className="flex items-center space-x-4 mb-6">
                <Input
                  placeholder="Search users..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="flex-grow"
                />
                <Select
                  value={roleFilter}
                  onChange={(e) => setRoleFilter(e.target.value)}
                  options={[
                    { value: 'all', label: 'All Roles' },
                    { value: 'admin', label: 'Admin' },
                    { value: 'manager', label: 'Manager' },
                    { value: 'user', label: 'User' },
                    { value: 'viewer', label: 'Viewer' }
                  ]}
                />
                <Select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  options={[
                    { value: 'all', label: 'All Status' },
                    { value: 'active', label: 'Active' },
                    { value: 'inactive', label: 'Inactive' },
                    { value: 'suspended', label: 'Suspended' },
                    { value: 'pending', label: 'Pending' }
                  ]}
                />
              </div>

              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="text-left border-b border-slate-700">
                      <th className="pb-3 text-text-secondary">Name</th>
                      <th className="pb-3 text-text-secondary">Email</th>
                      <th className="pb-3 text-text-secondary">Role</th>
                      <th className="pb-3 text-text-secondary">Status</th>
                      <th className="pb-3 text-text-secondary">Last Login</th>
                      <th className="pb-3 text-text-secondary">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredUsers.map(user => (
                      <tr 
                        key={user.id}
                        className="border-b border-slate-700 hover:bg-slate-800/50 cursor-pointer"
                        onClick={() => setSelectedUser(user)}
                      >
                        <td className="py-3 text-text-primary">{user.name}</td>
                        <td className="py-3 text-text-primary">{user.email}</td>
                        <td className="py-3">
                          <Badge
                            variant={
                              user.role === 'admin' ? 'purple' :
                              user.role === 'manager' ? 'blue' :
                              user.role === 'user' ? 'green' :
                              'gray'
                            }
                          >
                            {user.role}
                          </Badge>
                        </td>
                        <td className="py-3">
                          <Badge
                            variant={
                              user.status === 'active' ? 'green' :
                              user.status === 'inactive' ? 'yellow' :
                              user.status === 'suspended' ? 'red' :
                              'gray'
                            }
                          >
                            {user.status}
                          </Badge>
                        </td>
                        <td className="py-3 text-text-secondary">
                          {user.lastLogin ? new Date(user.lastLogin).toLocaleDateString() : 'Never'}
                        </td>
                        <td className="py-3">
                          <div className="flex items-center space-x-2">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedUser(user);
                                setIsEditing(true);
                              }}
                              className="p-1 hover:bg-slate-700 rounded"
                            >
                              <PencilIcon className="w-4 h-4 text-text-secondary" />
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleUserDelete(user.id);
                              }}
                              className="p-1 hover:bg-slate-700 rounded"
                            >
                              <TrashIcon className="w-4 h-4 text-red-400" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* User Details */}
          <div className="col-span-4">
            {selectedUser ? (
              <div className="bg-primary rounded-lg shadow-lg p-6">
                {renderUserDetails()}
              </div>
            ) : (
              <div className="bg-primary rounded-lg shadow-lg p-6 text-center text-text-secondary">
                Select a user to view details
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Create User Modal */}
      <Modal
        isOpen={isCreating}
        onClose={() => setIsCreating(false)}
        title="Create New User"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-text-secondary">Name</label>
            <Input
              placeholder="Enter name"
              value={selectedUser?.name || ''}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSelectedUser({ ...selectedUser, name: e.target.value } as User)}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-text-secondary">Email</label>
            <Input
              type="email"
              placeholder="Enter email"
              value={selectedUser?.email || ''}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSelectedUser({ ...selectedUser, email: e.target.value } as User)}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-text-secondary">Role</label>
            <Select
              value={selectedUser?.role || 'user'}
              onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setSelectedUser({ ...selectedUser, role: e.target.value as User['role'] } as User)}
              options={[
                { value: 'admin', label: 'Admin' },
                { value: 'manager', label: 'Manager' },
                { value: 'user', label: 'User' },
                { value: 'viewer', label: 'Viewer' }
              ]}
            />
          </div>
          <div className="flex justify-end space-x-4 mt-6">
            <Button
              variant="secondary"
              onClick={() => setIsCreating(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={(e: React.MouseEvent<HTMLButtonElement>) => {
                e.preventDefault();
                handleUserCreate(selectedUser as User);
              }}
              variant="primary"
            >
              Create User
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default UserManagementPage; 