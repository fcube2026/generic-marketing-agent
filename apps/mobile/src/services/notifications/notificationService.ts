import api from '../api';

export interface NotificationPreference {
  id: string;
  userId: string;
  pushEnabled: boolean;
  smsEnabled: boolean;
  emailEnabled: boolean;
  bookingUpdates: boolean;
  paymentUpdates: boolean;
  reminderEnabled: boolean;
  marketingEnabled: boolean;
}

export interface Notification {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: string;
  isRead: boolean;
  metadata?: Record<string, unknown>;
  createdAt: string;
}

/**
 * Get user's notifications
 */
export async function getNotifications(): Promise<Notification[]> {
  const response = await api.get<Notification[]>('/notifications/me');
  return response.data;
}

/**
 * Get unread notification count
 */
export async function getUnreadCount(): Promise<number> {
  const response = await api.get<number>('/notifications/me/unread-count');
  return response.data;
}

/**
 * Mark a notification as read
 */
export async function markAsRead(notificationId: string): Promise<Notification> {
  const response = await api.put<Notification>(`/notifications/${notificationId}/read`);
  return response.data;
}

/**
 * Mark all notifications as read
 */
export async function markAllAsRead(): Promise<{ success: boolean }> {
  const response = await api.put<{ success: boolean }>('/notifications/me/read-all');
  return response.data;
}

/**
 * Get user's notification preferences
 */
export async function getPreferences(): Promise<NotificationPreference> {
  const response = await api.get<NotificationPreference>('/notifications/me/preferences');
  return response.data;
}

/**
 * Update user's notification preferences
 */
export async function updatePreferences(
  preferences: Partial<NotificationPreference>,
): Promise<NotificationPreference> {
  const response = await api.put<NotificationPreference>('/notifications/me/preferences', preferences);
  return response.data;
}

export default {
  getNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  getPreferences,
  updatePreferences,
};
