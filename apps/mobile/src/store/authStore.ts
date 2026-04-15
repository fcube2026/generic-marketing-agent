import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { User } from '../types';
import {
  registerForPushNotifications,
  unregisterPushToken,
} from '../services/notifications/pushNotifications';

interface AuthState {
  token: string | null;
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  setAuth: (token: string, user: User) => Promise<void>;
  logout: () => Promise<void>;
  loadStoredAuth: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  token: null,
  user: null,
  isAuthenticated: false,
  isLoading: true,

  setAuth: async (token, user) => {
    await AsyncStorage.setItem('auth_token', token);
    await AsyncStorage.setItem('auth_user', JSON.stringify(user));
    set({ token, user, isAuthenticated: true });

    // Register for push notifications after successful login
    try {
      await registerForPushNotifications();
    } catch (error) {
      console.error('Failed to register for push notifications:', error);
    }
  },

  logout: async () => {
    // Unregister push token before logout
    try {
      await unregisterPushToken();
    } catch (error) {
      console.error('Failed to unregister push token:', error);
    }

    await AsyncStorage.removeItem('auth_token');
    await AsyncStorage.removeItem('auth_user');
    set({ token: null, user: null, isAuthenticated: false });
  },

  loadStoredAuth: async () => {
    try {
      const token = await AsyncStorage.getItem('auth_token');
      const userStr = await AsyncStorage.getItem('auth_user');
      if (token && userStr) {
        const user = JSON.parse(userStr);
        set({ token, user, isAuthenticated: true, isLoading: false });

        // Re-register for push notifications when restoring session
        try {
          await registerForPushNotifications();
        } catch (error) {
          console.error('Failed to register for push notifications:', error);
        }
      } else {
        set({ isLoading: false });
      }
    } catch {
      set({ isLoading: false });
    }
  },
}));
