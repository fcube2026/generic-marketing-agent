import React from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { Colors } from '../../constants/colors';
import { BookingStatusBadge } from '../../components/booking/BookingStatusBadge';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { bookingService } from '../../services/bookingService';
import { Booking, BookingStatus } from '../../types';
import { formatDateTime, formatCurrency } from '../../utils/format';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { PatientStackParamList } from '../../navigation/PatientNavigator';

type Nav = NativeStackNavigationProp<PatientStackParamList>;

const SUMMARY_STATUSES: BookingStatus[] = [
  'SUMMARY_SUBMITTED',
  'CLOSED',
];

export const HistoryScreen: React.FC = () => {
  const navigation = useNavigation<Nav>();
  const { data: bookings, isLoading } = useQuery<Booking[]>({
    queryKey: ['patient-bookings'],
    queryFn: bookingService.getMyBookings,
  });

  if (isLoading) return <LoadingSpinner fullScreen message="Loading history..." />;

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <Text style={styles.header}>Booking History</Text>
        <TouchableOpacity
          style={styles.summariesButton}
          onPress={() => navigation.navigate('ConsultationSummaries')}
        >
          <Text style={styles.summariesButtonText}>📋 Summaries</Text>
        </TouchableOpacity>
      </View>
      {(!bookings || bookings.length === 0) ? (
        <View style={styles.empty}>
          <Text style={styles.emptyIcon}>📋</Text>
          <Text style={styles.emptyTitle}>No bookings yet</Text>
          <Text style={styles.emptySubtitle}>Your booking history will appear here</Text>
        </View>
      ) : (
        <FlatList
          data={bookings}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => {
            const hasSummary = SUMMARY_STATUSES.includes(item.status as BookingStatus);
            return (
              <TouchableOpacity
                style={styles.item}
                onPress={() => navigation.navigate('Tracking', { bookingId: item.id })}
              >
                <View style={styles.itemHeader}>
                  <Text style={styles.providerName}>{item.provider?.name || 'Provider'}</Text>
                  <BookingStatusBadge status={item.status as BookingStatus} />
                </View>
                <Text style={styles.service}>{item.serviceCategory?.name}</Text>
                <View style={styles.itemFooter}>
                  <Text style={styles.date}>{formatDateTime(item.scheduledAt)}</Text>
                  <Text style={styles.fee}>{formatCurrency(item.totalFee)}</Text>
                </View>
                {hasSummary && (
                  <TouchableOpacity
                    style={styles.viewSummaryButton}
                    onPress={() =>
                      navigation.navigate('ConsultationSummary', { bookingId: item.id })
                    }
                  >
                    <Text style={styles.viewSummaryText}>View Summary →</Text>
                  </TouchableOpacity>
                )}
              </TouchableOpacity>
            );
          }}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 16,
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  header: {
    fontSize: 24,
    fontWeight: '800',
    color: Colors.text,
  },
  summariesButton: {
    backgroundColor: Colors.primaryLight,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
  },
  summariesButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.primary,
  },
  list: { padding: 16 },
  item: {
    backgroundColor: Colors.white,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
  },
  itemHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  providerName: { fontSize: 16, fontWeight: '700', color: Colors.text },
  service: { fontSize: 13, color: Colors.textMuted, marginBottom: 10 },
  itemFooter: { flexDirection: 'row', justifyContent: 'space-between' },
  date: { fontSize: 12, color: Colors.textMuted },
  fee: { fontSize: 14, fontWeight: '700', color: Colors.primary },
  viewSummaryButton: {
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    alignItems: 'center',
  },
  viewSummaryText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.primary,
  },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  emptyIcon: { fontSize: 48, marginBottom: 16 },
  emptyTitle: { fontSize: 20, fontWeight: '700', color: Colors.text, marginBottom: 8 },
  emptySubtitle: { fontSize: 14, color: Colors.textMuted, textAlign: 'center' },
});
