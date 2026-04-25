import { useEffect, useRef, useCallback } from 'react';
import * as Notifications from 'expo-notifications';
import { useNavigation } from '@react-navigation/native';
import {
  registerForPushNotifications,
  setupNotificationListeners,
  getLastNotificationResponse,
  configureAndroidChannel,
  setBadgeCount,
  PushNotificationData,
} from '../services/notifications/pushNotifications';
import { getUnreadCount } from '../services/notifications/notificationService';

/**
 * Hook to manage push notifications throughout the app.
 * Handles registration, listeners, and deep linking from notifications.
 * 
 * Usage: Call once in App.tsx or root component when user is authenticated.
 */
export function usePushNotifications(isAuthenticated: boolean) {
  const navigation = useNavigation<any>();
  const notificationListenerCleanup = useRef<(() => void) | null>(null);

  // Handle notification tap - navigate to appropriate screen
  const handleNotificationResponse = useCallback(
    (response: Notifications.NotificationResponse) => {
      const data = response.notification.request.content.data as PushNotificationData;
      
      if (!data) return;

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
    [navigation],
  );

  // Handle notification received in foreground
  const handleNotificationReceived = useCallback(
    async (_notification: Notifications.Notification) => {
      // Update badge count when notification received
      try {
        const count = await getUnreadCount();
        await setBadgeCount(count);
      } catch (error) {
        console.error('Failed to update badge count:', error);
      }
    },
    [],
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
