import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { User } from '../types';

interface AuthState {
  token: string | null;
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  /** null = not yet determined; false = profile missing; true = profile present */
  hasProfile: boolean | null;
  setAuth: (token: string, user: User) => Promise<void>;
  setHasProfile: (value: boolean) => Promise<void>;
  logout: () => Promise<void>;
  loadStoredAuth: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  token: null,
  user: null,
  isAuthenticated: false,
  isLoading: true,
  hasProfile: null,

  setAuth: async (token, user) => {
    await AsyncStorage.setItem('auth_token', token);
    await AsyncStorage.setItem('auth_user', JSON.stringify(user));
    // Reset hasProfile so RootNavigator will re-check after login
    await AsyncStorage.removeItem('has_profile');
    set({ token, user, isAuthenticated: true, hasProfile: null });
  },

  setHasProfile: async (value) => {
    await AsyncStorage.setItem('has_profile', value ? 'true' : 'false');
    set({ hasProfile: value });
  },

  logout: async () => {
    await AsyncStorage.removeItem('auth_token');
    await AsyncStorage.removeItem('auth_user');
    await AsyncStorage.removeItem('has_profile');
    set({ token: null, user: null, isAuthenticated: false, hasProfile: null });
  },

  loadStoredAuth: async () => {
    try {
      const token = await AsyncStorage.getItem('auth_token');
      const userStr = await AsyncStorage.getItem('auth_user');
      const hasProfileStr = await AsyncStorage.getItem('has_profile');
      if (token && userStr) {
        const user = JSON.parse(userStr);
        const hasProfile = hasProfileStr === 'true' ? true : hasProfileStr === 'false' ? false : null;
        set({ token, user, isAuthenticated: true, hasProfile, isLoading: false });
      } else {
        set({ isLoading: false });
      }
    } catch {
      set({ isLoading: false });
    }
  },
}));
