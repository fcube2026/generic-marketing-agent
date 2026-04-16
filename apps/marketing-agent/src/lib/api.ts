import axios from 'axios';

const api = axios.create({
  baseURL: '/api/backend',
  headers: { 'Content-Type': 'application/json' },
});

// Attach JWT to every request
api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('marketing_token');
    if (token) config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Auto-logout on 401
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (typeof window !== 'undefined' && err.response?.status === 401) {
      const isAuthRequest = err.config?.url?.includes('/auth/marketing-login');
      if (!isAuthRequest && window.location.pathname !== '/login') {
        localStorage.removeItem('marketing_token');
        localStorage.removeItem('marketing_user');
        document.cookie = 'marketing_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
        window.location.href = '/login';
      }
    }
    return Promise.reject(err);
  }
);

export default api;