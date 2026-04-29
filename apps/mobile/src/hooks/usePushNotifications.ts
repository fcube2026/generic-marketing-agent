import { useEffect, useRef, useCallback } from 'react';
import * as Notifications from 'expo-notifications';
import { useNavigation } from '@react-navigation/native';
import { useQueryClient } from '@tanstack/react-query';
import {
  registerForPushNotifications,
  setupNotificationListeners,
  getLastNotificationResponse,
  configureAndroidChannel,
  setBadgeCount,
  PushNotificationData,
} from '../services/notifications/pushNotifications';
import { getUnreadCount } from '../services/notifications/notificationService';

const BOOKING_NOTIFICATION_TYPES = new Set([
  'BOOKING_REQUEST',
  'BOOKING_ACCEPTED',
  'BOOKING_DECLINED',
  'BOOKING_CANCELLED',
  'BOOKING_STATUS_UPDATE',
  'PROVIDER_ON_THE_WAY',
  'PROVIDER_ARRIVED',
  'CONSULTATION_STARTED',
  'CONSULTATION_COMPLETED',
  'PAYMENT_SUCCESS',
  'PAYMENT_REFUNDED',
]);

function invalidateBookingCaches(
  queryClient: ReturnType<typeof useQueryClient>,
  bookingId?: string,
) {
  // Refresh both list views and the specific booking so the patient and
  // provider see status changes immediately, even when the app was in the
  // background and the only signal was the push notification.
  queryClient.invalidateQueries({ queryKey: ['patient-bookings'] });
  queryClient.invalidateQueries({ queryKey: ['provider-bookings'] });
  if (bookingId) {
    queryClient.invalidateQueries({ queryKey: ['booking', bookingId] });
  }
}

/**
 * Hook to manage push notifications throughout the app.
 * Handles registration, listeners, and deep linking from notifications.
 * 
 * Usage: Call once in App.tsx or root component when user is authenticated.
 */
export function usePushNotifications(isAuthenticated: boolean) {
  const navigation = useNavigation<any>();
  const queryClient = useQueryClient();
  const notificationListenerCleanup = useRef<(() => void) | null>(null);

  // Handle notification tap - navigate to appropriate screen
  const handleNotificationResponse = useCallback(
    (response: Notifications.NotificationResponse) => {
      const data = response.notification.request.content.data as PushNotificationData;

      if (!data) return;

      // Whatever the type, refresh booking data before navigating so the
      // destination screen renders the latest status.
      if (BOOKING_NOTIFICATION_TYPES.has(data.type)) {
        invalidateBookingCaches(queryClient, data.bookingId);
      }

      // Navigate based on notification type
      switch (data.type) {
        case 'BOOKING_REQUEST':
        case 'BOOKING_ACCEPTED':
        case 'BOOKING_DECLINED':
        case 'BOOKING_CANCELLED':
        case 'BOOKING_STATUS_UPDATE':
          if (data.bookingId) {
            navigation.navigate('BookingDetail', { bookingId: data.bookingId });
          }
          break;

        case 'PROVIDER_ON_THE_WAY':
        case 'PROVIDER_ARRIVED':
        case 'CONSULTATION_STARTED':
        case 'CONSULTATION_COMPLETED':
          if (data.bookingId) {
            navigation.navigate('BookingDetail', { bookingId: data.bookingId });
          }
          break;

        case 'LAB_RESULT_READY':
          // Navigate to diagnostics
          navigation.navigate('PatientTabs', { screen: 'Diagnostics' });
          break;

        case 'REFILL_REMINDER':
          navigation.navigate('PharmacyOrders');
          break;

        case 'PAYMENT_SUCCESS':
        case 'PAYMENT_REFUNDED':
          if (data.bookingId) {
            navigation.navigate('BookingDetail', { bookingId: data.bookingId });
          }
          break;

        case 'PROVIDER_APPROVED':
        case 'PROVIDER_REJECTED':
        case 'PROVIDER_DEACTIVATED':
        case 'NMC_VERIFICATION_SUCCESS':
          // Navigate to provider profile
          navigation.navigate('ProviderTabs', { screen: 'Profile' });
          break;

        case 'PAYOUT_PROCESSED':
          // Navigate to earnings/payouts
          navigation.navigate('ProviderTabs', { screen: 'Earnings' });
          break;

        case 'PHARMACY_ORDER_STATUS_UPDATE':
          if (data.pharmacyOrderId) {
            navigation.navigate('OrderTracking', { orderId: data.pharmacyOrderId });
          } else {
            navigation.navigate('PharmacyOrders');
          }
          break;

        default:
          // Navigate to notifications list
          navigation.navigate('Notifications');
      }
    },
    [navigation, queryClient],
  );

  // Handle notification received in foreground
  const handleNotificationReceived = useCallback(
    async (notification: Notifications.Notification) => {
      const data = notification.request.content.data as PushNotificationData | undefined;
      if (data && BOOKING_NOTIFICATION_TYPES.has(data.type)) {
        // Foreground push: refresh caches so any open list/detail screen
        // reflects the new status without waiting for the next poll tick.
        invalidateBookingCaches(queryClient, data.bookingId);
      }
      // Update badge count when notification received
      try {
        const count = await getUnreadCount();
        await setBadgeCount(count);
      } catch (error) {
        console.error('Failed to update badge count:', error);
      }
    },
    [queryClient],
  );

  // Initialize push notifications when authenticated
  useEffect(() => {
    if (!isAuthenticated) {
      // Clean up listeners when logged out
      if (notificationListenerCleanup.current) {
        notificationListenerCleanup.current();
        notificationListenerCleanup.current = null;
      }
      return;
    }

    const initializePushNotifications = async () => {
      // Configure Android notification channels
      await configureAndroidChannel();

      // Register for push notifications
      await registerForPushNotifications();

      // Set up notification listeners
      notificationListenerCleanup.current = setupNotificationListeners(
        handleNotificationReceived,
        handleNotificationResponse,
      );

      // Check for notification that opened the app
      const lastResponse = await getLastNotificationResponse();
      if (lastResponse) {
        handleNotificationResponse(lastResponse);
      }

      // Update badge count
      try {
        const count = await getUnreadCount();
        await setBadgeCount(count);
      } catch {
        // Ignore badge count errors
      }
    };

    initializePushNotifications();

    // Cleanup on unmount
    return () => {
      if (notificationListenerCleanup.current) {
        notificationListenerCleanup.current();
        notificationListenerCleanup.current = null;
      }
    };
  }, [isAuthenticated, handleNotificationReceived, handleNotificationResponse]);
}

export default usePushNotifications;
