import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import {
  Notification,
  getNotifications,
  markAsRead,
  markAllAsRead,
  getUnreadCount,
} from '../../services/notifications';
import { setBadgeCount } from '../../services/notifications/pushNotifications';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

const formatTimeAgo = (dateString: string): string => {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
};

const getNotificationIcon = (type: string): string => {
  switch (type) {
    case 'BOOKING_REQUEST':
      return '📋';
    case 'BOOKING_ACCEPTED':
      return '✅';
    case 'BOOKING_DECLINED':
      return '❌';
    case 'BOOKING_CANCELLED':
      return '🚫';
    case 'BOOKING_STATUS_UPDATE':
    case 'PROVIDER_ON_THE_WAY':
      return '🚗';
    case 'PROVIDER_ARRIVED':
      return '📍';
    case 'CONSULTATION_STARTED':
    case 'CONSULTATION_COMPLETED':
      return '🩺';
    case 'LAB_RESULT_READY':
      return '🧪';
    case 'PAYMENT_SUCCESS':
    case 'PAYMENT_RECEIVED':
      return '💳';
    case 'PAYMENT_REFUNDED':
      return '💰';
    case 'PROVIDER_APPROVED':
    case 'NMC_VERIFICATION_SUCCESS':
      return '🎉';
    case 'PROVIDER_REJECTED':
      return '⚠️';
    case 'PAYOUT_PROCESSED':
      return '🏦';
    case 'APPOINTMENT_REMINDER':
      return '⏰';
    default:
      return '🔔';
  }
};

export function NotificationsScreen() {
  const navigation = useNavigation<any>();
  const queryClient = useQueryClient();
  const [refreshing, setRefreshing] = useState(false);

  const { data: notifications = [], isLoading, refetch } = useQuery({
    queryKey: ['notifications'],
    queryFn: getNotifications,
  });

  const markReadMutation = useMutation({
    mutationFn: markAsRead,
    onSuccess: async () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      // Update badge count
      const count = await getUnreadCount();
      await setBadgeCount(count);
    },
  });

  const markAllReadMutation = useMutation({
    mutationFn: markAllAsRead,
    onSuccess: async () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      await setBadgeCount(0);
    },
  });

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  const handleNotificationPress = (notification: Notification) => {
    // Mark as read if unread
    if (!notification.isRead) {
      markReadMutation.mutate(notification.id);
    }

    // Navigate based on notification type and metadata
    const metadata = notification.metadata as { bookingId?: string } | undefined;
    
    switch (notification.type) {
      case 'BOOKING_REQUEST':
      case 'BOOKING_ACCEPTED':
      case 'BOOKING_DECLINED':
      case 'BOOKING_CANCELLED':
      case 'BOOKING_STATUS_UPDATE':
      case 'PROVIDER_ON_THE_WAY':
      case 'PROVIDER_ARRIVED':
      case 'CONSULTATION_STARTED':
      case 'CONSULTATION_COMPLETED':
      case 'PAYMENT_SUCCESS':
      case 'PAYMENT_REFUNDED':
        if (metadata?.bookingId) {
          navigation.navigate('BookingDetail', { bookingId: metadata.bookingId });
        }
        break;
      case 'LAB_RESULT_READY':
        navigation.navigate('PatientTabs', { screen: 'Diagnostics' });
        break;
      default:
        // Just mark as read, no navigation
        break;
    }
  };

  const unreadCount = notifications.filter(n => !n.isRead).length;

  const renderNotification = ({ item }: { item: Notification }) => (
    <TouchableOpacity
      style={[styles.notificationItem, !item.isRead && styles.unreadItem]}
      onPress={() => handleNotificationPress(item)}
      activeOpacity={0.7}
    >
      <View style={styles.iconContainer}>
        <Text style={styles.icon}>{getNotificationIcon(item.type)}</Text>
      </View>
      <View style={styles.notificationContent}>
        <View style={styles.notificationHeader}>
          <Text style={[styles.notificationTitle, !item.isRead && styles.unreadTitle]}>
            {item.title}
          </Text>
          <Text style={styles.timeAgo}>{formatTimeAgo(item.createdAt)}</Text>
        </View>
        <Text style={styles.notificationMessage} numberOfLines={2}>
          {item.message}
        </Text>
      </View>
      {!item.isRead && <View style={styles.unreadDot} />}
    </TouchableOpacity>
  );

  if (isLoading && !refreshing) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#0D9488" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header with Mark All Read */}
      {unreadCount > 0 && (
        <View style={styles.header}>
          <Text style={styles.unreadCountText}>{unreadCount} unread</Text>
          <TouchableOpacity
            onPress={() => markAllReadMutation.mutate()}
            disabled={markAllReadMutation.isPending}
          >
            <Text style={styles.markAllReadText}>Mark all read</Text>
          </TouchableOpacity>
        </View>
      )}

      <FlatList
        data={notifications}
        renderItem={renderNotification}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor="#0D9488"
            colors={['#0D9488']}
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>🔔</Text>
            <Text style={styles.emptyTitle}>No notifications</Text>
            <Text style={styles.emptyText}>
              You&apos;ll see notifications about your bookings, payments, and updates here.
            </Text>
          </View>
        }
      />

      {/* Settings Button */}
      <TouchableOpacity
        style={styles.settingsButton}
        onPress={() => navigation.navigate('NotificationSettings')}
      >
        <Text style={styles.settingsIcon}>⚙️</Text>
        <Text style={styles.settingsText}>Notification Settings</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  unreadCountText: {
    fontSize: 14,
    color: '#6B7280',
  },
  markAllReadText: {
    fontSize: 14,
    color: '#0D9488',
    fontWeight: '600',
  },
  listContent: {
    flexGrow: 1,
  },
  notificationItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  unreadItem: {
    backgroundColor: '#F0FDFA',
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  icon: {
    fontSize: 20,
  },
  notificationContent: {
    flex: 1,
  },
  notificationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 4,
  },
  notificationTitle: {
    fontSize: 15,
    fontWeight: '500',
    color: '#374151',
    flex: 1,
    marginRight: 8,
  },
  unreadTitle: {
    fontWeight: '600',
    color: '#111827',
  },
  timeAgo: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  notificationMessage: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 20,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#0D9488',
    marginLeft: 8,
    marginTop: 6,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
    marginTop: 60,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 20,
  },
  settingsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  settingsIcon: {
    fontSize: 16,
    marginRight: 8,
  },
  settingsText: {
    fontSize: 15,
    color: '#0D9488',
    fontWeight: '500',
  },
});

export default NotificationsScreen;
