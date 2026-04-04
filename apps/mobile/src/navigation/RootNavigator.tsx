import React, { useEffect, useCallback } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { useAuthStore } from '../store/authStore';
import { AuthNavigator } from './AuthNavigator';
import { PatientNavigator } from './PatientNavigator';
import { ProviderNavigator } from './ProviderNavigator';
import { LoadingSpinner } from '../components/common/LoadingSpinner';

export const RootNavigator: React.FC = () => {
  const { isAuthenticated, isLoading, loadStoredAuth, user } = useAuthStore();

  const initAuth = useCallback(() => {
    loadStoredAuth();
  }, [loadStoredAuth]);

  useEffect(() => {
    initAuth();
  }, [initAuth]);

  if (isLoading) {
    return <LoadingSpinner fullScreen message="Loading..." />;
  }

  return (
    <NavigationContainer>
      {isAuthenticated ? (
        user?.role === 'PROVIDER' ? <ProviderNavigator /> : <PatientNavigator />
      ) : (
        <AuthNavigator />
      )}
    </NavigationContainer>
  );
};
