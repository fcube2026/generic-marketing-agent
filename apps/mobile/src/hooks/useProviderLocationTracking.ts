import { useEffect, useRef } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { getCurrentLocation } from '../utils/location';
import { bookingService } from '../services/bookingService';

const LOCATION_INTERVAL_MS = 10_000; // Push location every 10 seconds

/**
 * Hook that pushes the provider's location to the backend at a fixed interval
 * while the booking is in a trackable status (ACCEPTED, ON_THE_WAY, ARRIVED, IN_PROGRESS)
 * and the app is in the foreground.
 */
export const useProviderLocationTracking = (
  bookingId: string | undefined,
  status: string | undefined,
) => {
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const isTrackable =
    !!bookingId &&
    !!status &&
    ['ACCEPTED', 'ON_THE_WAY', 'ARRIVED', 'IN_PROGRESS'].includes(status);

  useEffect(() => {
    if (!isTrackable || !bookingId) return;

    const pushLocation = async () => {
      try {
        const coords = await getCurrentLocation();
        if (coords) {
          await bookingService.updateProviderLocation(
            bookingId,
            coords.lat,
            coords.lng,
          );
        }
      } catch {
        // Silently ignore – robust against network loss
      }
    };

    // Push immediately, then at interval
    pushLocation();
    intervalRef.current = setInterval(pushLocation, LOCATION_INTERVAL_MS);

    // Pause when app goes to background, resume when foreground
    const handleAppState = (nextState: AppStateStatus) => {
      if (nextState === 'active') {
        pushLocation();
        if (!intervalRef.current) {
          intervalRef.current = setInterval(pushLocation, LOCATION_INTERVAL_MS);
        }
      } else {
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
      }
    };

    const subscription = AppState.addEventListener('change', handleAppState);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      subscription.remove();
    };
  }, [isTrackable, bookingId]);
};
