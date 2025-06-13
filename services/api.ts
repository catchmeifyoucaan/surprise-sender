import axios from 'axios';
import { User, UserActivity, SmtpConfiguration, EmailData, TelegramConfig } from '../types';

const api = axios.create({
  baseURL: 'http://localhost:3001/api',
  headers: {
    'Content-Type': 'application/json'
  }
});

// Add request interceptor to include token in headers
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('surpriseSenderUser');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Add response interceptor to handle 401 errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 && !error.config.url.includes('/auth/')) {
      // Only remove token and redirect for non-auth endpoints
      localStorage.removeItem('surpriseSenderUser');
      window.dispatchEvent(new CustomEvent('auth:logout'));
    }
    return Promise.reject(error);
  }
);

export const auth = {
  login: async (email: string, password: string) => {
    try {
      const response = await api.post('/auth/login', { email, password });
      const { token, user } = response.data;
      
      if (!token) {
        throw new Error('No token received');
      }

      // Store token in localStorage
      localStorage.setItem('surpriseSenderUser', token);
      
      // Set default Authorization header for future requests
      api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      
      return { user, token };
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  },

  register: async (userData: Omit<User, 'id' | 'role' | 'registeredAt'>) => {
    const response = await api.post('/auth/register', userData);
    return response.data;
  },

  verify2FA: async (code: string) => {
    const response = await api.post('/auth/verify-2fa', { code });
    return response.data;
  },

  setup2FA: async () => {
    const response = await api.post('/auth/setup-2fa');
    return response.data;
  },

  disable2FA: async (code: string) => {
    const response = await api.post('/auth/disable-2fa', { code });
    return response.data;
  }
};

export const users = {
  getProfile: async () => {
    const response = await api.get('/users/profile');
    return response.data;
  },

  updateProfile: async (data: Partial<User>) => {
    const response = await api.patch('/users/profile', data);
    return response.data;
  },

  getActivities: async () => {
    try {
      const response = await api.get('/users/activities');
      return response.data;
    } catch (error) {
      console.error('Get activities error:', error);
      throw error;
    }
  },

  logActivity: async (activity: Omit<UserActivity, 'id' | 'timestamp'>) => {
    try {
      const response = await api.post('/users/activities', activity);
      return response.data;
    } catch (error) {
      console.error('Log activity error:', error);
      throw error;
    }
  },

  changePassword: async (data: any) => {
    const response = await api.post('/users/change-password', data);
    return response.data;
  },

  getAgents: async () => {
    const response = await api.get('/agents');
    return response.data;
  },

  getTrackingStats: async () => {
    const response = await api.get('/tracking/stats');
    return response.data;
  },
};

export const smtp = {
  getConfigs: async () => {
    const response = await api.get('/smtp/configs');
    return response.data;
  },

  addConfig: async (config: Omit<SmtpConfiguration, 'id' | 'userId' | 'createdAt' | 'updatedAt'>) => {
    const response = await api.post('/smtp/configs', config);
    return response.data;
  },

  updateConfig: async (id: string, config: Partial<SmtpConfiguration>) => {
    const response = await api.patch(`/smtp/configs/${id}`, config);
    return response.data;
  },

  deleteConfig: async (id: string) => {
    const response = await api.delete(`/smtp/configs/${id}`);
    return response.data;
  },

  validateConfig: async (config: Partial<SmtpConfiguration>) => {
    const response = await api.post('/smtp/validate', config);
    return response.data;
  },

  importConfigurations: async (formData: FormData) => {
    const response = await api.post('/settings/smtp/import', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },
};

export const email = {
  send: async (data: EmailData) => {
    const response = await api.post('/send-email', data);
    return response.data;
  },

  getDrafts: async () => {
    const response = await api.get('/emails/drafts');
    return response.data;
  },

  saveDraft: async (draft: EmailData) => {
    const response = await api.post('/emails/drafts', draft);
    return response.data;
  },

  deleteDraft: async (id: string) => {
    const response = await api.delete(`/emails/drafts/${id}`);
    return response.data;
  },
};

export const telegram = {
  updateConfig: async (config: TelegramConfig) => {
    const response = await api.post('/telegram/config', config);
    return response.data;
  },

  getConfig: async () => {
    const response = await api.get('/telegram/config');
    return response.data;
  },
};

export default api; 