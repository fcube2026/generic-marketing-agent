import axios from 'axios';

function getApiBaseUrl(): string {
  if (process.env.NEXT_PUBLIC_API_URL) {
    return process.env.NEXT_PUBLIC_API_URL;
  }
  // When deployed (not localhost), fall back to the production API URL so that
  // Vercel auto-deploys work even when NEXT_PUBLIC_API_URL is not configured.
  if (typeof window !== 'undefined' && window.location.hostname !== 'localhost') {
    return 'https://api.curex24.com/api/v1';
  }
  return 'http://localhost:3000/api/v1';
}

const api = axios.create({
  baseURL: getApiBaseUrl(),
  headers: {
    'Content-Type': 'application/json',
    'Cache-Control': 'no-cache',
    Pragma: 'no-cache',
  },
});

api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('admin_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (typeof window !== 'undefined' && err.response?.status === 401) {
      // Don't redirect when on the login page or when calling auth endpoints
      // to let the login form display the specific error message.
      const isAuthRequest = err.config?.url?.includes('/auth/admin-login');
      const isLoginPage = window.location.pathname === '/login';

      if (!isAuthRequest && !isLoginPage) {
        localStorage.removeItem('admin_token');
        localStorage.removeItem('admin_user');
        document.cookie = 'admin_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
        window.location.href = '/login';
      }
    }
    return Promise.reject(err);
  }
);

export default api;
