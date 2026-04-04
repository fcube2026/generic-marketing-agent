import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { User } from '../types';

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
  token: null, user: null, isAuthenticated: false, isLoading: true,
  setAuth: async (token, user) => {
    await AsyncStorage.setItem('provider_auth_token', token);
    await AsyncStorage.setItem('provider_auth_user', JSON.stringify(user));
    set({ token, user, isAuthenticated: true });
  },
  logout: async () => {
    await AsyncStorage.removeItem('provider_auth_token');
    await AsyncStorage.removeItem('provider_auth_user');
    set({ token: null, user: null, isAuthenticated: false });
  },
  loadStoredAuth: async () => {
    try {
      const token = await AsyncStorage.getItem('provider_auth_token');
      const userStr = await AsyncStorage.getItem('provider_auth_user');
      if (token && userStr) set({ token, user: JSON.parse(userStr), isAuthenticated: true, isLoading: false });
      else set({ isLoading: false });
    } catch { set({ isLoading: false }); }
  },
}));
