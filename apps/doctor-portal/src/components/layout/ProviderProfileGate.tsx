'use client';

import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import api from '@/lib/api';

/**
 * Sits inside the (dashboard) layout. On first load it pings /providers/me.
 * If the doctor has no ProviderProfile yet (404 from the API), every other
 * dashboard page (`/dashboard`, `/consultations`, `/earnings`, `/profile`,
 * `/patients`) would otherwise render blank because they all depend on the
 * provider profile existing. So we transparently redirect to /onboarding
 * once, and let the user back into the dashboard after they save.
 */
export default function ProviderProfileGate({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    // Onboarding page does its own check.
    if (pathname?.startsWith('/onboarding')) {
      setReady(true);
      return;
    }

    let cancelled = false;
    api
      .get('/providers/me')
      .then(() => {
        if (!cancelled) setReady(true);
      })
      .catch((err) => {
        if (cancelled) return;
        if (err?.response?.status === 404) {
          router.replace('/onboarding');
          return;
        }
        // For 401 the api interceptor already redirects to /login.
        // For any other error let the page render so it can show its own UI.
        setReady(true);
      });

    return () => {
      cancelled = true;
    };
  }, [pathname, router]);

  if (!ready) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return <>{children}</>;
}
