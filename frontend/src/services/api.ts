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
  // WebAuthn Biometrics
  generateRegOptions: () => api.post('/auth/webauthn/register/options'),
  verifyRegResponse: (data: any) => api.post('/auth/webauthn/register/verify', data),
  generateAuthOptions: (data: { email: string }) => api.post('/auth/webauthn/login/options', data),
  verifyAuthResponse: (data: { email: string, response: any }) => api.post('/auth/webauthn/login/verify', data),
};

export const syncApi = {
  sync: (queue: any[]) => api.post('/sync', { queue }),
  masterReset: (data: { reason: string, password: string }) => api.post('/sync/master-reset', data)
};

export default api;
