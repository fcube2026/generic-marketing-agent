'use client';

import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { logout as clearAuth } from '@/app/(auth)/auth.module';

interface AuthUser {
  email: string;
  role: string;
}

interface AuthContextValue {
  user: AuthUser | null;
  isLoading: boolean;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  isLoading: true,
  logout: () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    try {
      const raw = localStorage.getItem('marketing_user');
      if (raw) {
        setUser(JSON.parse(raw) as AuthUser);
      }
    } catch {
      // corrupted storage — treat as logged out
    } finally {
      setIsLoading(false);
    }
  }, []);

  const logout = useCallback(() => {
    clearAuth();
    setUser(null);
    router.push('/login');
  }, [router]);

  return (
    <AuthContext.Provider value={{ user, isLoading, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  return useContext(AuthContext);
}
