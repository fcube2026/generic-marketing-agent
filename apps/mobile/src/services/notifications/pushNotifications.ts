import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import api from '../api';
import AsyncStorage from '@react-native-async-storage/async-storage';

const PUSH_TOKEN_KEY = 'push_notification_token';

function getExpoProjectId(): string | null {
  const easProjectId =
    Constants.easConfig?.projectId ||
    Constants.expoConfig?.extra?.eas?.projectId;

  if (typeof easProjectId === 'string' && easProjectId.trim().length > 0) {
    return easProjectId;
  }

  return null;
}

// Configure how notifications should be handled when app is in foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export interface PushNotificationData {
  type?: string;
  bookingId?: string;
  pharmacyOrderId?: string;
  [key: string]: unknown;
}

/**
 * Request notification permissions and register for push notifications
 */
export async function registerForPushNotifications(): Promise<string | null> {
  // Push notifications only work on physical devices
  if (!Device.isDevice) {
    console.log('Push notifications require a physical device');
    return null;
  }

  // Check existing permissions
  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  // Request permissions if not granted
  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') {
    console.log('Push notification permission denied');
    return null;
  }

  const projectId = getExpoProjectId();
  if (!projectId) {
    console.log('Skipping Expo push token registration: EAS projectId is not configured');
    return null;
  }

  try {
    // Get Expo push token
    const tokenData = await Notifications.getExpoPushTokenAsync({
      projectId,
    });

    const token = tokenData.data;
    console.log('Expo push token:', token);

    // Store token locally
    await AsyncStorage.setItem(PUSH_TOKEN_KEY, token);

    // Register token with backend
    await registerTokenWithBackend(token);

    return token;
  } catch (error) {
    console.error('Failed to get push token:', error);
    return null;
  }
}

/**
 * Register the push token with the backend API
 */
async function registerTokenWithBackend(token: string): Promise<void> {
  try {
    const platform = Platform.OS as 'ios' | 'android' | 'web';
    await api.post('/notifications/device-token', {
      token,
      platform,
    });
    console.log('Push token registered with backend');
  } catch (error) {
    console.error('Failed to register push token with backend:', error);
  }
}

/**
 * Unregister the push token from the backend (e.g., on logout)
 */
export async function unregisterPushToken(): Promise<void> {
  try {
    const token = await AsyncStorage.getItem(PUSH_TOKEN_KEY);
    if (token) {
      await api.put('/notifications/device-token/unregister', { token });
      await AsyncStorage.removeItem(PUSH_TOKEN_KEY);
      console.log('Push token unregistered');
    }
  } catch (error) {
    console.error('Failed to unregister push token:', error);
  }
}

/**
 * Get the stored push token
 */
export async function getStoredPushToken(): Promise<string | null> {
  return AsyncStorage.getItem(PUSH_TOKEN_KEY);
}

/**
 * Set up notification listeners
 * Returns cleanup function to remove listeners
 */
export function setupNotificationListeners(
  onNotificationReceived?: (notification: Notifications.Notification) => void,
  onNotificationResponse?: (response: Notifications.NotificationResponse) => void,
): () => void {
  // Listener for notifications received while app is in foreground
  const notificationSubscription = Notifications.addNotificationReceivedListener(
    (notification) => {
      console.log('Notification received in foreground:', notification);
      onNotificationReceived?.(notification);
    }
  );

  // Listener for when user interacts with notification
  const responseSubscription = Notifications.addNotificationResponseReceivedListener(
    (response) => {
      console.log('Notification response:', response);
      onNotificationResponse?.(response);
    }
  );

  // Return cleanup function
  return () => {
    notificationSubscription.remove();
    responseSubscription.remove();
  };
}

/**
 * Get the last notification response (for deep linking on app start)
 */
export async function getLastNotificationResponse(): Promise<Notifications.NotificationResponse | null> {
  return Notifications.getLastNotificationResponseAsync();
}

/**
 * Set badge count
 */
export async function setBadgeCount(count: number): Promise<void> {
  await Notifications.setBadgeCountAsync(count);
}

/**
 * Clear all notifications
 */
export async function clearAllNotifications(): Promise<void> {
  await Notifications.dismissAllNotificationsAsync();
}

/**
 * Schedule a local notification (useful for reminders)
 */
export async function scheduleLocalNotification(
  title: string,
  body: string,
  data?: PushNotificationData,
  triggerSeconds?: number,
): Promise<string> {
  const trigger = triggerSeconds ? { seconds: triggerSeconds } : null;
  
  return Notifications.scheduleNotificationAsync({
    content: {
      title,
      body,
      data: data as Record<string, unknown>,
      sound: true,
    },
    trigger,
  });
}

/**
 * Cancel a scheduled notification
 */
export async function cancelScheduledNotification(notificationId: string): Promise<void> {
  await Notifications.cancelScheduledNotificationAsync(notificationId);
}

/**
 * Configure Android notification channel (call once on app start)
 */
export async function configureAndroidChannel(): Promise<void> {
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'Default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#0D9488',
      sound: 'default',
    });

    await Notifications.setNotificationChannelAsync('bookings', {
      name: 'Booking Updates',
      description: 'Notifications about your bookings',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#0D9488',
      sound: 'default',
    });

    await Notifications.setNotificationChannelAsync('payments', {
      name: 'Payment Updates',
      description: 'Notifications about payments and payouts',
      importance: Notifications.AndroidImportance.HIGH,
      sound: 'default',
    });
  }
}
