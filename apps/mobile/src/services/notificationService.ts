import api from './api';

export interface Notification {
  id: string;
  title: string;
  message: string;
  type: string;
  metadata?: any;
  isRead: boolean;
  createdAt: string;
}

export const notificationService = {
  getNotifications: async (): Promise<Notification[]> => {
    const response = await api.get('/notifications/me');
    return response.data;
  },

  markAsRead: async (id: string) => {
    await api.put(`/notifications/${id}/read`);
  },

  getUnreadCount: async (): Promise<number> => {
    const response = await api.get('/notifications/me/unread-count');
    return response.data;
  },
};
