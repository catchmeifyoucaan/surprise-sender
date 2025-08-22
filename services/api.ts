import axios from 'axios';
import { User, UserActivity, SmtpConfiguration, EmailData, TelegramConfig } from '../types';

const resolvedBaseUrl = (typeof window !== 'undefined' && window.location && window.location.origin)
  ? `${window.location.origin}/api`
  : (import.meta as any).env?.VITE_API_URL || 'http://localhost:3001/api';

const api = axios.create({
  baseURL: resolvedBaseUrl,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Add request interceptor to include token in headers
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('surpriseSenderUser');
    if (token) {
      (config.headers as any).Authorization = `Bearer ${token}`;
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
      (api.defaults.headers as any).common['Authorization'] = `Bearer ${token}`;
      
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
  // SmtpTab expected names
  getConfigurations: async () => {
    const response = await api.get('/smtp/configs');
    return response.data;
  },
  addConfiguration: async (config: Partial<SmtpConfiguration>) => {
    const response = await api.post('/smtp/configs', config);
    return response.data;
  },
  deleteConfiguration: async (id: string) => {
    const response = await api.delete(`/smtp/configs/${id}`);
    return response.data;
  },
  validateConfiguration: async (id: string) => {
    const response = await api.post(`/smtp/configs/${id}/validate`);
    return response.data;
  },
  importConfigurations: async (file: File, _selectedConfigIds?: string[], options?: { persistSmtp?: boolean }) => {
    const form = new FormData();
    form.append('file', file);
    const params = new URLSearchParams();
    if (options && options.persistSmtp === false) params.set('persistSmtp', 'false');
    const response = await api.post(`/smtp/import-configs?${params.toString()}`, form, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    return response.data;
  },
  bulkDelete: async (ids: string[]) => {
    const response = await api.post('/smtp/bulk-delete', { ids });
    return response.data;
  },
  exportCsv: async (): Promise<Blob> => {
    const response = await api.get('/smtp/export', { responseType: 'blob' });
    return response.data as Blob;
  },
  // Backward-compatible aliases
  getConfigs: async () => smtp.getConfigurations(),
  addConfig: async (config: Partial<SmtpConfiguration>) => smtp.addConfiguration(config),
  updateConfig: async (id: string, config: Partial<SmtpConfiguration>) => {
    const response = await api.patch(`/smtp/configs/${id}`, config);
    return response.data;
  },
  deleteConfig: async (id: string) => smtp.deleteConfiguration(id),
  validateConfig: async (config: Partial<SmtpConfiguration>) => {
    // if id present, validate by id; otherwise simple stateless validate endpoint
    if ((config as any).id) {
      return smtp.validateConfiguration((config as any).id);
    }
    const response = await api.post('/smtp/validate', config);
    return response.data;
  }
};

export const mixed = {
  import: async (file: File, options?: { persistSmtp?: boolean; persistMixed?: boolean }) => {
    const form = new FormData();
    form.append('file', file);
    const params = new URLSearchParams();
    if (options && options.persistSmtp === false) params.set('persistSmtp', 'false');
    if (options && options.persistMixed === false) params.set('persistMixed', 'false');
    const response = await api.post(`/ingest/import?${params.toString()}`, form, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    return response.data;
  },
  list: async () => {
    const [webmail, cpanel, phpmyadmin, emailAccounts, emails] = await Promise.all([
      api.get('/mixed/webmail'),
      api.get('/mixed/cpanel'),
      api.get('/mixed/phpmyadmin'),
      api.get('/mixed/email-accounts'),
      api.get('/mixed/emails')
    ]);
    return {
      webmail: webmail.data,
      cpanel: cpanel.data,
      phpmyadmin: phpmyadmin.data,
      emailAccounts: emailAccounts.data,
      emails: emails.data
    };
  },
  promoteEmailAccounts: async (ids: string[]) => {
    const response = await api.post('/mixed/promote/email-accounts', { ids });
    return response.data;
  },
  bulkDelete: async (type: 'webmail' | 'cpanel' | 'phpmyadmin' | 'emailAccounts' | 'emails', ids: string[]) => {
    const response = await api.post('/mixed/bulk-delete', { type, ids });
    return response.data;
  },
  exportCsv: async (type: 'webmail' | 'cpanel' | 'phpmyadmin' | 'emailAccounts' | 'emails'): Promise<Blob> => {
    const response = await api.get(`/mixed/export?type=${encodeURIComponent(type)}`, { responseType: 'blob' });
    return response.data as Blob;
  }
};

export const email = {
  send: async (data: EmailData) => {
    const response = await api.post('/send-email', data);
    return response.data;
  },

  sendBulk: async (emails: EmailData[], smtpConfigs: SmtpConfiguration[], options?: any) => {
    const response = await api.post('/email/send-bulk', { emails, smtpConfigs, options });
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

export const sms = {
  sendBulk: async (recipients: string[], message: string, options?: any) => {
    const response = await api.post('/sms/send-bulk', { recipients, message, ...options });
    return response.data;
  }
};

export const ingest = {
  importMixed: async (file: File, options?: { persistSmtp?: boolean; persistMixed?: boolean }) => mixed.import(file, options)
};

export default api; 