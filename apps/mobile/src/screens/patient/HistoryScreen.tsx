import React, { useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, RefreshControl } from 'react-native';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useFocusEffect } from '@react-navigation/native';
import { Colors } from '../../constants/colors';
import { BookingStatusBadge } from '../../components/booking/BookingStatusBadge';
import { PaymentStatusBadge } from '../../components/booking/PaymentStatusBadge';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { VerificationBanner } from '../../components/verification/VerificationBanner';
import { bookingService } from '../../services/bookingService';
import { Booking, BookingStatus, PaymentStatus } from '../../types';
import { formatDateTime, formatCurrency } from '../../utils/format';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { PatientStackParamList } from '../../navigation/PatientNavigator';

type Nav = NativeStackNavigationProp<PatientStackParamList>;

export const HistoryScreen: React.FC = () => {
  const navigation = useNavigation<Nav>();
  const queryClient = useQueryClient();
  const { data: bookings, isLoading, refetch, isRefetching } = useQuery<Booking[]>({
    queryKey: ['patient-bookings'],
    queryFn: bookingService.getMyBookings,
    refetchInterval: 15000,
    refetchOnWindowFocus: 'always',
    staleTime: 0,
  });

  useFocusEffect(
    useCallback(() => {
      queryClient.invalidateQueries({ queryKey: ['patient-bookings'] });
    }, [queryClient]),
  );

  if (isLoading) return <LoadingSpinner fullScreen message="Loading history..." />;

  return (
    <View style={styles.container}>
      <VerificationBanner />
      <Text style={styles.header}>Booking History</Text>
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
          refreshControl={
            <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={Colors.primary} />
          }
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.item}
              onPress={() => {
                navigation.navigate('Tracking', { bookingId: item.id });
              }}
            >
              <View style={styles.itemHeader}>
                <Text style={styles.providerName}>{item.provider?.name || 'Provider'}</Text>
                <BookingStatusBadge status={item.status as BookingStatus} />
              </View>
              <Text style={styles.service}>{item.serviceCategory?.name}</Text>
              <View style={styles.modeContainer}>
                <Text style={styles.modeText}>
                  {item.mode === 'VIDEO_CONSULTATION'
                    ? '📹 Video Consultation'
                    : item.mode === 'HOME_VISIT'
                    ? '🏠 Home Visit'
                    : '🏥 Clinic Visit'}
                </Text>
              </View>
              <View style={styles.itemFooter}>
                <Text style={styles.date}>{formatDateTime(item.scheduledAt)}</Text>
                <PaymentStatusBadge status={item.paymentStatus as PaymentStatus} />
                <Text style={styles.fee}>{formatCurrency(item.totalFee)}</Text>
              </View>
            </TouchableOpacity>
          )}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: {
    fontSize: 24,
    fontWeight: '800',
    color: Colors.text,
    padding: 20,
    paddingTop: 60,
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
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
  service: { fontSize: 13, color: Colors.textMuted, marginBottom: 4 },
  modeContainer: {
    backgroundColor: Colors.background,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    alignSelf: 'flex-start',
    marginBottom: 10,
  },
  modeText: { fontSize: 12, fontWeight: '600', color: Colors.primary },
  itemFooter: { flexDirection: 'row', justifyContent: 'space-between' },
  date: { fontSize: 12, color: Colors.textMuted },
  fee: { fontSize: 14, fontWeight: '700', color: Colors.primary },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  emptyIcon: { fontSize: 48, marginBottom: 16 },
  emptyTitle: { fontSize: 20, fontWeight: '700', color: Colors.text, marginBottom: 8 },
  emptySubtitle: { fontSize: 14, color: Colors.textMuted, textAlign: 'center' },
});
