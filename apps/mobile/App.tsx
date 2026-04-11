import React, { useState, useEffect, ErrorInfo } from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { View, Text, StyleSheet } from 'react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { RootNavigator } from './src/navigation/RootNavigator';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      staleTime: 1000 * 60 * 5,
    },
  },
});

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  ErrorBoundaryState
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    console.error('[ErrorBoundary] Error caught:', error);
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[ErrorBoundary] Component stack:', errorInfo.componentStack);
  }

  render() {
    if (this.state.hasError) {
      return (
        <SafeAreaProvider>
          <View style={styles.errorContainer}>
            <Text style={styles.errorTitle}>Oops! Something went wrong</Text>
            <Text style={styles.errorText}>{this.state.error?.message}</Text>
          </View>
        </SafeAreaProvider>
      );
    }

    return this.props.children;
  }
}

export default function App() {
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    console.log('[App] Initializing...');
    setIsReady(true);
  }, []);

  if (!isReady) {
    return null;
  }

  return (
    <ErrorBoundary>
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          <StatusBar style="light" />
          <RootNavigator />
        </QueryClientProvider>
      </SafeAreaProvider>
    </ErrorBoundary>
  );
}

const styles = StyleSheet.create({
  errorContainer: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#EF4444',
    marginBottom: 10,
  },
  errorText: {
    fontSize: 14,
    color: '#1E293B',
    textAlign: 'center',
  },
});
