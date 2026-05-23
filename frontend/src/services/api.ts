import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || (import.meta.env.PROD ? '/api' : 'http://localhost:5000/api');

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add token to requests
api.interceptors.request.use((config) => {
  const token = sessionStorage.getItem('auth_token') || localStorage.getItem('auth_token');
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const authApi = {
  login: (credentials: any) => api.post('/auth/login', credentials),
  register: (data: any) => api.post('/auth/register', data),
  changePassword: (data: any) => api.post('/auth/change-password', data),
};

export const webauthnApi = {
  generateRegistrationOptions: () => api.get('/auth/webauthn/register/options'),
  verifyRegistration: (response: any) => api.post('/auth/webauthn/register/verify', response),
  generateAuthenticationOptions: (email: string) => api.post('/auth/webauthn/login/options', { email }),
  verifyAuthentication: (email: string, response: any) => api.post('/auth/webauthn/login/verify', { email, response }),
};

export const syncApi = {
  sync: (queue: any[]) => api.post('/sync', { queue }),
};

export default api;
