import React, { useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { useAuthStore } from '../store/authStore';
import { AuthNavigator } from './AuthNavigator';
import { ProviderNavigator } from './ProviderNavigator';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
export const RootNavigator: React.FC = () => {
  const { isAuthenticated, isLoading, loadStoredAuth } = useAuthStore();
  useEffect(() => { loadStoredAuth(); }, []);
  if (isLoading) return <LoadingSpinner fullScreen message="Loading..." />;
  return (
    <NavigationContainer>
      {isAuthenticated ? <ProviderNavigator /> : <AuthNavigator />}
    </NavigationContainer>
  );
};
