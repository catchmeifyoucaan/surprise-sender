import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User, UserActivity, SmtpConfiguration, EmailData, TelegramConfig } from '../types';
import { auth as authApi, users as usersApi } from '../services/api';
import { jwtDecode } from 'jwt-decode';

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  registeredUsers: User[];
  userActivities: UserActivity[];
  smtpConfigurations: SmtpConfiguration[];
  emailDrafts: EmailData[];
  telegramConfig: TelegramConfig | null;
  login: (email: string, password: string) => Promise<User>;
  logout: () => void;
  registerUser: (userData: Omit<User, 'id' | 'role' | 'registeredAt'>) => Promise<User>;
  logUserActivity: (userId: string, activity: string) => Promise<void>;
  getUserActivities: (userId: string) => UserActivity[];
  setSmtpConfigurations: (configs: SmtpConfiguration[]) => void;
  saveEmailDraft: (draft: EmailData) => void;
  deleteEmailDraft: (subject: string) => void;
  setTelegramConfig: (config: TelegramConfig) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const isAdminEmail = (email: string): boolean => {
  return /^admin-\d+@surprisesender\.com$/.test(email) || email === 'user@example.com';
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [registeredUsers, setRegisteredUsers] = useState<User[]>([]);
  const [userActivities, setUserActivities] = useState<UserActivity[]>([]);
  const [smtpConfigurations, setSmtpConfigurations] = useState<SmtpConfiguration[]>([]);
  const [emailDrafts, setEmailDrafts] = useState<EmailData[]>([]);
  const [telegramConfig, setTelegramConfig] = useState<TelegramConfig | null>(null);

  const checkTokenExpiration = (token: string): boolean => {
    try {
      const decoded: any = jwtDecode(token);
      const currentTime = Date.now() / 1000;
      // Add a 5-minute buffer to prevent edge cases
      return decoded.exp > currentTime + 300;
    } catch {
      return false;
    }
  };

  // Initialize auth state
  useEffect(() => {
    const initializeAuth = async () => {
      try {
        const token = localStorage.getItem('surpriseSenderUser');
        if (token && checkTokenExpiration(token)) {
          const userData = await usersApi.getProfile();
          setUser(userData);
          setIsAuthenticated(true);
          
          // Load user activities
          const activities = await usersApi.getActivities();
          setUserActivities(activities);
        } else {
          localStorage.removeItem('surpriseSenderUser');
          setUser(null);
          setIsAuthenticated(false);
        }
      } catch (error) {
        console.error("Error initializing AuthContext:", error);
        localStorage.removeItem('surpriseSenderUser');
        setUser(null);
        setIsAuthenticated(false);
      } finally {
        setIsLoading(false);
      }
    };

    initializeAuth();
  }, []);

  // Set up token expiration check interval
  useEffect(() => {
    if (!isAuthenticated) return;

    const checkToken = () => {
      const token = localStorage.getItem('surpriseSenderUser');
      if (!token || !checkTokenExpiration(token)) {
        logout();
      }
    };

    const interval = setInterval(checkToken, 60000); // Check every minute
    return () => clearInterval(interval);
  }, [isAuthenticated]);

  // Load persisted data on mount
  useEffect(() => {
    const loadPersistedData = () => {
      const storedUsers = localStorage.getItem('surpriseSender_registeredUsers');
      const storedActivities = localStorage.getItem('surpriseSender_userActivities');
      const storedSmtpConfigs = localStorage.getItem('surpriseSender_smtpConfigs');
      const storedEmailDrafts = localStorage.getItem('surpriseSender_emailDrafts');
      const storedTelegramConfig = localStorage.getItem('surpriseSender_telegramConfig');

      if (storedUsers) setRegisteredUsers(JSON.parse(storedUsers));
      if (storedActivities) setUserActivities(JSON.parse(storedActivities));
      if (storedSmtpConfigs) setSmtpConfigurations(JSON.parse(storedSmtpConfigs));
      if (storedEmailDrafts) setEmailDrafts(JSON.parse(storedEmailDrafts));
      if (storedTelegramConfig) setTelegramConfig(JSON.parse(storedTelegramConfig));
    };

    loadPersistedData();
  }, []);

  // Persist registeredUsers
  useEffect(() => {
    if (!isLoading) {
      localStorage.setItem('surpriseSender_registeredUsers', JSON.stringify(registeredUsers));
    }
  }, [registeredUsers, isLoading]);

  // Persist userActivities
  useEffect(() => {
    if (!isLoading) {
      localStorage.setItem('surpriseSender_userActivities', JSON.stringify(userActivities));
    }
  }, [userActivities, isLoading]);

  // Persist smtpConfigurations
  useEffect(() => {
    if (!isLoading) {
      localStorage.setItem('surpriseSender_smtpConfigs', JSON.stringify(smtpConfigurations));
    }
  }, [smtpConfigurations, isLoading]);

  // Persist emailDrafts
  useEffect(() => {
    if (!isLoading) {
      localStorage.setItem('surpriseSender_emailDrafts', JSON.stringify(emailDrafts));
    }
  }, [emailDrafts, isLoading]);

  // Persist telegramConfig
  useEffect(() => {
    if (!isLoading) {
      localStorage.setItem('surpriseSender_telegramConfig', JSON.stringify(telegramConfig));
    }
  }, [telegramConfig, isLoading]);

  // Add event listener for auth:logout
  useEffect(() => {
    const handleLogout = () => {
      logout();
    };

    window.addEventListener('auth:logout', handleLogout);
    return () => window.removeEventListener('auth:logout', handleLogout);
  }, []);

  const login = async (email: string, password: string) => {
    try {
      const { user: userData, token } = await authApi.login(email, password);
      
      if (!token) {
        throw new Error('No token received');
      }

      // Update state first
      setUser(userData);
      setIsAuthenticated(true);
      
      // Load user activities
      const activities = await usersApi.getActivities();
      setUserActivities(activities);
      
      return userData;
    } catch (error) {
      console.error("Login error:", error);
      throw error;
    }
  };

  const logout = () => {
    setUser(null);
    setIsAuthenticated(false);
    setUserActivities([]);
    localStorage.removeItem('surpriseSenderUser');
  };

  const registerUser = async (userData: Omit<User, 'id' | 'role' | 'registeredAt'>) => {
    try {
      const response = await authApi.register(userData);
      const newUser = response.user;
      
      // Add to registered users
      setRegisteredUsers(prev => [...prev, newUser]);
      
      // Log activity
      await logUserActivity(newUser.id, `New user registered: ${newUser.email}`);
      
      return newUser;
    } catch (error) {
      console.error("Registration error:", error);
      throw error;
    }
  };

  const logUserActivity = async (userId: string, activity: string) => {
    try {
      const newActivity = await usersApi.logActivity(userId, activity);
      setUserActivities(prev => [...prev, newActivity]);
    } catch (error) {
      console.error("Error logging activity:", error);
    }
  };

  const getUserActivities = (userId: string) => {
    return userActivities.filter(activity => activity.userId === userId);
  };

  const saveEmailDraft = (draft: EmailData) => {
    setEmailDrafts(prev => {
      const existingIndex = prev.findIndex(d => d.subject === draft.subject);
      if (existingIndex >= 0) {
        const updated = [...prev];
        updated[existingIndex] = draft;
        return updated;
      }
      return [...prev, draft];
    });
  };

  const deleteEmailDraft = (subject: string) => {
    setEmailDrafts(prev => prev.filter(draft => draft.subject !== subject));
  };

  const value = {
    user,
    isAuthenticated,
    isLoading,
    registeredUsers,
    userActivities,
    smtpConfigurations,
    emailDrafts,
    telegramConfig,
    login,
    logout,
    registerUser,
    logUserActivity,
    getUserActivities,
    setSmtpConfigurations,
    saveEmailDraft,
    deleteEmailDraft,
    setTelegramConfig
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
