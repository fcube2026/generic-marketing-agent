import React, { useEffect, useCallback, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { View, Text, StyleSheet } from 'react-native';
import { useAuthStore } from '../store/authStore';
import { AuthNavigator } from './AuthNavigator';
import { PatientNavigator } from './PatientNavigator';
import { ProviderNavigator } from './ProviderNavigator';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import { Colors } from '../constants/colors';

export const RootNavigator: React.FC = () => {
  const { isAuthenticated, isLoading, loadStoredAuth, user } = useAuthStore();
  const [error, setError] = useState<string | null>(null);

  const initAuth = useCallback(async () => {
    try {
      console.log('[RootNavigator] Initializing auth...');
      await loadStoredAuth();
      console.log('[RootNavigator] Auth initialized. isAuthenticated:', isAuthenticated);
    } catch (err) {
      console.error('[RootNavigator] Auth init error:', err);
      setError(String(err));
    }
  }, [loadStoredAuth, isAuthenticated]);

  useEffect(() => {
    initAuth();
  }, [initAuth]);

  if (error) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorTitle}>Initialization Error</Text>
        <Text style={styles.errorText}>{error}</Text>
      </View>
    );
  }

  if (isLoading) {
    return <LoadingSpinner fullScreen message="Loading app..." />;
  }

  return (
    <NavigationContainer
      onStateChange={(state) => {
        console.log('[RootNavigator] Navigation state:', state);
      }}
      onReady={() => {
        console.log('[RootNavigator] NavigationContainer ready');
      }}
    >
      {isAuthenticated ? (
        user?.role === 'PROVIDER' ? <ProviderNavigator /> : <PatientNavigator />
      ) : (
        <AuthNavigator />
      )}
    </NavigationContainer>
  );
};

const styles = StyleSheet.create({
  errorContainer: {
    flex: 1,
    backgroundColor: Colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.error,
    marginBottom: 10,
  },
  errorText: {
    fontSize: 14,
    color: Colors.text,
    textAlign: 'center',
  },
});
