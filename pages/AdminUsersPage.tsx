import React, { useState, useEffect } from 'react';
import { User, UserActivity } from '../types';
import Button from '../components/common/Button';
import { UserIcon as TableUserIcon, EnvelopeIcon, EyeIcon, InformationCircleIcon } from '@heroicons/react/24/outline';
import { AdminPanelIcon } from '../constants';
import { useAuth } from '../context/AuthContext'; 

const AdminUsersPage: React.FC = () => {
  const auth = useAuth();
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [userSpecificActivities, setUserSpecificActivities] = useState<UserActivity[]>([]);

  // Use registeredUsers from AuthContext directly
  const displayUsers = React.useMemo(() => {
    return [...auth.registeredUsers].sort((a,b) => new Date(b.registeredAt || 0).getTime() - new Date(a.registeredAt || 0).getTime());
  }, [auth.registeredUsers]);


  const handleViewInteractions = (user: User) => {
    setSelectedUser(user);
    setUserSpecificActivities(auth.getUserActivities(user.id));
    setIsModalOpen(true);
    auth.logUserActivity(auth.user?.id || 'admin-action', `Viewed activity log for user: ${user.email}`);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setSelectedUser(null);
    setUserSpecificActivities([]);
  };
  
  return (
    <div className="bg-secondary p-4 sm:p-6 rounded-lg shadow-xl min-h-full">
      <h1 className="text-3xl font-bold text-text-primary mb-6 border-b-2 border-accent pb-3 flex items-center">
        <AdminPanelIcon className="w-8 h-8 mr-3 text-accent"/> User Management & Activity
      </h1>

      <div className="bg-primary p-4 sm:p-6 rounded-lg shadow-2xl border border-slate-700">
        <h2 className="text-xl font-semibold text-text-primary mb-4">Registered Users ({displayUsers.length})</h2>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-700">
            <thead className="bg-slate-800">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">Full Name</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">Email</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">Role</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">Registered At</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-primary divide-y divide-slate-700">
              {displayUsers.map(user => (
                <tr key={user.id} className="hover:bg-slate-700/30 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-text-primary">{user.fullName}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-text-secondary">{user.email}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                      user.role === 'admin' ? 'bg-accent text-primary' : 'bg-slate-600 text-text-secondary'
                    }`}>
                      {user.role}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-text-secondary">
                    {user.registeredAt ? new Date(user.registeredAt).toLocaleString() : 'N/A'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <Button variant="ghost" size="sm" onClick={() => handleViewInteractions(user)} className="text-sky-400 !p-1.5 flex items-center">
                      <EyeIcon className="w-4 h-4 mr-1"/> View Activity
                    </Button>
                  </td>
                </tr>
              ))}
               {displayUsers.length === 0 && (
                <tr>
                    <td colSpan={5} className="px-6 py-4 text-center text-text-secondary">No users found. New registrations will appear here.</td>
                </tr>
                )}
            </tbody>
          </table>
        </div>
      </div>

      {isModalOpen && selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-75 p-4 transition-opacity duration-300">
          <div className="bg-secondary p-6 rounded-lg shadow-xl w-full max-w-2xl border border-slate-600 transform transition-all duration-300 scale-100">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-semibold text-accent flex items-center">
                <InformationCircleIcon className="w-6 h-6 mr-2"/> Activity Log for {selectedUser.fullName}
              </h3>
              <button onClick={closeModal} className="text-text-secondary hover:text-text-primary text-2xl leading-none">&times;</button>
            </div>
            <div className="space-y-1 text-sm max-h-96 overflow-y-auto pr-2">
                <p className="flex items-center mb-2"><TableUserIcon className="w-5 h-5 mr-2 text-highlight" /> <strong>User ID:</strong> {selectedUser.id}</p>
                <p className="flex items-center mb-3"><EnvelopeIcon className="w-5 h-5 mr-2 text-highlight" /> <strong>Email:</strong> {selectedUser.email}</p>
                
                <h4 className="text-md font-semibold text-text-primary mt-3 mb-1 border-b border-slate-700 pb-1">Recent Activities:</h4>
                {userSpecificActivities.length > 0 ? (
                    userSpecificActivities.slice().reverse().map(activity => ( 
                        <div key={activity.id} className="p-2 bg-slate-800/50 rounded-md mb-1.5">
                            <p className="text-text-primary text-xs">{activity.description}</p>
                            <p className="text-text-secondary text-xs">{new Date(activity.timestamp).toLocaleString()}</p>
                        </div>
                    ))
                ) : (
                    <p className="text-text-secondary italic">No specific activities logged for this user yet.</p>
                )}
            </div>
            <div className="mt-6 text-right">
              <Button variant="primary" onClick={closeModal}>Close</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminUsersPage;