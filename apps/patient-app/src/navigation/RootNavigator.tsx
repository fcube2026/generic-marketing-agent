import React, { useEffect, useCallback } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { useAuthStore } from '../store/authStore';
import { AuthNavigator } from './AuthNavigator';
import { OnboardingNavigator } from './OnboardingNavigator';
import { PatientNavigator } from './PatientNavigator';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import { patientService } from '../services/patientService';

export const RootNavigator: React.FC = () => {
  const { isAuthenticated, isLoading, hasProfile, setHasProfile, loadStoredAuth } =
    useAuthStore();

  const initAuth = useCallback(() => {
    loadStoredAuth();
  }, [loadStoredAuth]);

  useEffect(() => {
    initAuth();
  }, [initAuth]);

  /** After login, if hasProfile is still undetermined, fetch from API */
  useEffect(() => {
    if (!isAuthenticated || hasProfile !== null) return;

    let cancelled = false;
    const fetchProfile = async () => {
      try {
        const profile = await patientService.getMyProfile();
        if (!cancelled) {
          setHasProfile(profile !== null);
        }
      } catch {
        if (!cancelled) {
          // On error assume no profile so user can create one
          setHasProfile(false);
        }
      }
    };

    fetchProfile();
    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, hasProfile, setHasProfile]);

  if (isLoading) {
    return <LoadingSpinner fullScreen message="Loading..." />;
  }

  return (
    <NavigationContainer>
      {!isAuthenticated ? (
        <AuthNavigator />
      ) : hasProfile === null ? (
        <LoadingSpinner fullScreen message="Setting up..." />
      ) : hasProfile ? (
        <PatientNavigator />
      ) : (
        <OnboardingNavigator />
      )}
    </NavigationContainer>
  );
};
