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
    const status = error.response?.status as number | undefined;
    const url = error.config?.url || '';
    const method = (error.config?.method || 'get').toUpperCase();

    // In development, surface enough context (URL + status + body) to debug
    // generic "couldn't load …" UIs without having to attach a debugger.
    // Suppress expected 403s from tracking/location polling after a booking
    // ends — these are not actionable and just spam the LogBox.
    const isExpectedTrackingNoise =
      status === 403 && url.includes('/tracking/location');

    if (__DEV__ && !isExpectedTrackingNoise) {
      // eslint-disable-next-line no-console
      console.warn(
        `[api] ${method} ${url} failed`,
        status ? `→ ${status}` : '(no response)',
        error.response?.data ?? error.message,
      );
    }

    // A 401 from any endpoint means the stored token is no longer valid
    // (expired, revoked, or signed for a different environment). Clearing
    // it here ensures the next app render falls back to the auth flow
    // instead of looping on failing patient/provider requests.
    if (status === 401) {
      await AsyncStorage.removeItem('auth_token');
      await AsyncStorage.removeItem('auth_user');
    }

    return Promise.reject(error);
  }
);

export default api;
