import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_BASE_URL } from '../constants/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use(async (config) => {
  const token = await AsyncStorage.getItem('auth_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      // Only clear token if the auth endpoint itself rejected us,
      // not for regular API calls that might fail for other reasons
      const url = error.config?.url || '';
      const isAuthEndpoint = url.includes('/auth/');
      if (isAuthEndpoint) {
        await AsyncStorage.removeItem('auth_token');
      }
    }
    return Promise.reject(error);
  }
);

export default api;
