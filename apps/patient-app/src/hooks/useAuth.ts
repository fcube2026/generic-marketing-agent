import { useAuthStore } from '../store/authStore';

export const useAuth = () => {
  const { user, token, isAuthenticated, logout } = useAuthStore();

  return {
    user,
    token,
    isAuthenticated,
    logout,
  };
};
