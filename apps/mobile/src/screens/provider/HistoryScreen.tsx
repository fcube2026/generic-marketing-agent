import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Colors } from '../../constants/colors';
import { BookingStatusBadge } from '../../components/booking/BookingStatusBadge';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { bookingService } from '../../services/bookingService';
import { formatCurrency, formatDate, formatTime } from '../../utils/format';
import { Booking, BookingStatus } from '../../types';
import { ProviderStackParamList } from '../../navigation/ProviderNavigator';

type Nav = NativeStackNavigationProp<ProviderStackParamList>;

const FILTER_TABS = [
  { key: 'all', label: 'All' },
  { key: 'completed', label: 'Completed' },
  { key: 'cancelled', label: 'Cancelled' },
] as const;

type FilterKey = (typeof FILTER_TABS)[number]['key'];

export const HistoryScreen: React.FC = () => {
  const navigation = useNavigation<Nav>();
  const [activeFilter, setActiveFilter] = useState<FilterKey>('all');

  const {
    data: bookings = [],
    isLoading,
    refetch,
    isRefetching,
  } = useQuery<Booking[]>({
    queryKey: ['provider-bookings-history'],
    queryFn: bookingService.getProviderBookings,
  });

  const filteredBookings = bookings.filter((b) => {
    if (activeFilter === 'completed') {
      return ['COMPLETED', 'SUMMARY_SUBMITTED', 'CLOSED'].includes(b.status);
    }
    if (activeFilter === 'cancelled') {
      return b.status === 'CANCELLED';
    }
    return true;
  });

  const sortedBookings = [...filteredBookings].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  const renderBooking = useCallback(
    ({ item }: { item: Booking }) => (
      <TouchableOpacity
        style={styles.bookingCard}
        onPress={() => {
          if (item.mode === 'VIDEO_CONSULTATION') {
            navigation.navigate('VideoConsultation', { bookingId: item.id });
          } else {
            navigation.navigate('BookingDetail', { bookingId: item.id });
          }
        }}
        activeOpacity={0.7}
      >
        <View style={styles.bookingHeader}>
          <View style={styles.bookingHeaderLeft}>
            <Text style={styles.patientName}>{item.patient?.name || 'Patient'}</Text>
            <Text style={styles.serviceText}>{item.serviceCategory?.name || 'Service'}</Text>
          </View>
          <BookingStatusBadge status={item.status as BookingStatus} />
        </View>

        <View style={styles.bookingMeta}>
          <View style={styles.metaItem}>
            <Text style={styles.metaLabel}>Date</Text>
            <Text style={styles.metaValue}>{formatDate(item.createdAt)}</Text>
          </View>
          <View style={styles.metaItem}>
            <Text style={styles.metaLabel}>Time</Text>
            <Text style={styles.metaValue}>{formatTime(item.scheduledAt)}</Text>
          </View>
          <View style={styles.metaItem}>
            <Text style={styles.metaLabel}>Mode</Text>
            <Text style={styles.metaValue}>
              {item.mode === 'HOME_VISIT' ? '🏠 Home' : item.mode === 'VIDEO_CONSULTATION' ? '🎥 Video' : '🏥 Clinic'}
            </Text>
          </View>
          <View style={styles.metaItem}>
            <Text style={styles.metaLabel}>Fee</Text>
            <Text style={[styles.metaValue, { color: Colors.primary, fontWeight: '800' }]}>
              {formatCurrency(item.totalFee)}
            </Text>
          </View>
        </View>

        <View style={styles.viewDetailRow}>
          <Text style={styles.viewDetailText}>View Details →</Text>
        </View>
      </TouchableOpacity>
    ),
    [navigation]
  );

  if (isLoading) return <LoadingSpinner fullScreen />;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>📋 Booking History</Text>
        <Text style={styles.headerSubtitle}>
          {sortedBookings.length} booking{sortedBookings.length !== 1 ? 's' : ''}
        </Text>
      </View>

      {/* Filter Tabs */}
      <View style={styles.filterRow}>
        {FILTER_TABS.map((tab) => (
          <TouchableOpacity
            key={tab.key}
            style={[styles.filterTab, activeFilter === tab.key && styles.filterTabActive]}
            onPress={() => setActiveFilter(tab.key)}
          >
            <Text
              style={[
                styles.filterTabText,
                activeFilter === tab.key && styles.filterTabTextActive,
              ]}
            >
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <FlatList
        data={sortedBookings}
        renderItem={renderBooking}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={refetch}
            tintColor={Colors.primary}
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>📭</Text>
            <Text style={styles.emptyTitle}>No Bookings Yet</Text>
            <Text style={styles.emptySubtitle}>
              {activeFilter === 'all'
                ? 'Your completed bookings will appear here.'
                : `No ${activeFilter} bookings found.`}
            </Text>
          </View>
        }
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: {
    backgroundColor: Colors.primary,
    padding: 20,
    paddingTop: 60,
  },
  headerTitle: { fontSize: 22, fontWeight: '800', color: Colors.white },
  headerSubtitle: { fontSize: 13, color: 'rgba(255,255,255,0.75)', marginTop: 4 },
  filterRow: {
    flexDirection: 'row',
    padding: 16,
    gap: 8,
  },
  filterTab: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: Colors.white,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  filterTabActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  filterTabText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textMuted,
  },
  filterTabTextActive: {
    color: Colors.white,
  },
  listContent: { paddingHorizontal: 16, paddingBottom: 40 },
  bookingCard: {
    backgroundColor: Colors.white,
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
  },
  bookingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  bookingHeaderLeft: {},
  patientName: { fontSize: 16, fontWeight: '700', color: Colors.text },
  serviceText: { fontSize: 13, color: Colors.textMuted, marginTop: 2 },
  bookingMeta: {
    flexDirection: 'row',
    backgroundColor: Colors.background,
    borderRadius: 10,
    padding: 10,
    gap: 4,
  },
  metaItem: { flex: 1, alignItems: 'center' },
  metaLabel: { fontSize: 10, color: Colors.textMuted, textTransform: 'uppercase', marginBottom: 2 },
  metaValue: { fontSize: 12, fontWeight: '600', color: Colors.text },
  viewDetailRow: { marginTop: 10, alignItems: 'flex-end' },
  viewDetailText: { fontSize: 13, color: Colors.primary, fontWeight: '600' },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 80,
    paddingHorizontal: 32,
  },
  emptyIcon: { fontSize: 64, marginBottom: 16 },
  emptyTitle: { fontSize: 20, fontWeight: '700', color: Colors.text, marginBottom: 8 },
  emptySubtitle: {
    fontSize: 14,
    color: Colors.textMuted,
    textAlign: 'center',
    lineHeight: 20,
  },
});
