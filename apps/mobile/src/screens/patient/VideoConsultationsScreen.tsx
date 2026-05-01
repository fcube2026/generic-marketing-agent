import React, { useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Colors } from '../../constants/colors';
import { BookingStatusBadge } from '../../components/booking/BookingStatusBadge';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { bookingService } from '../../services/bookingService';
import { Booking, BookingStatus } from '../../types';
import { formatDateTime, formatCurrency } from '../../utils/format';
import { PatientStackParamList } from '../../navigation/PatientNavigator';

type Nav = NativeStackNavigationProp<PatientStackParamList>;

export const VideoConsultationsScreen: React.FC = () => {
  const navigation = useNavigation<Nav>();
  const queryClient = useQueryClient();

  const {
    data: bookings,
    isLoading,
    refetch,
    isRefetching,
  } = useQuery<Booking[]>({
    queryKey: ['patient-video-consultations'],
    queryFn: bookingService.getActiveVideoConsultations,
    refetchInterval: 15000,
    refetchOnWindowFocus: 'always',
    staleTime: 0,
  });

  useFocusEffect(
    useCallback(() => {
      queryClient.invalidateQueries({ queryKey: ['patient-video-consultations'] });
    }, [queryClient]),
  );

  if (isLoading) return <LoadingSpinner fullScreen message="Loading consultations..." />;

  return (
    <View style={styles.container}>
      <Text style={styles.header}>📹 Video Consultations</Text>

      {!bookings || bookings.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyIcon}>📹</Text>
          <Text style={styles.emptyTitle}>No consultations available</Text>
          <Text style={styles.emptySubtitle}>
            Your video consultations will appear here
          </Text>
        </View>
      ) : (
        <FlatList
          data={bookings}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl
              refreshing={isRefetching}
              onRefresh={refetch}
              tintColor={Colors.primary}
            />
          }
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.item}
              onPress={() => navigation.navigate('Tracking', { bookingId: item.id })}
            >
              <View style={styles.itemHeader}>
                <Text style={styles.providerName}>{item.provider?.name || 'Provider'}</Text>
                <BookingStatusBadge status={item.status as BookingStatus} />
              </View>
              <Text style={styles.service}>{item.serviceCategory?.name}</Text>
              <View style={styles.modeContainer}>
                <Text style={styles.modeText}>📹 Video Consultation</Text>
              </View>
              <View style={styles.itemFooter}>
                <Text style={styles.date}>{formatDateTime(item.scheduledAt)}</Text>
                <Text style={styles.fee}>{formatCurrency(item.totalFee)}</Text>
              </View>
              {(item.status === 'ACCEPTED' || item.status === 'IN_PROGRESS') && (
                <TouchableOpacity
                  style={styles.joinBtn}
                  onPress={() => navigation.navigate('VideoLobby', { bookingId: item.id })}
                >
                  <Text style={styles.joinBtnText}>📹 Join Video Call</Text>
                </TouchableOpacity>
              )}
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
    fontSize: 22,
    fontWeight: '800',
    color: Colors.text,
    padding: 20,
    paddingTop: 60,
    paddingBottom: 16,
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
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  providerName: { fontSize: 16, fontWeight: '700', color: Colors.text },
  service: { fontSize: 13, color: Colors.textMuted, marginBottom: 4 },
  modeContainer: {
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    alignSelf: 'flex-start',
    marginBottom: 10,
  },
  modeText: { fontSize: 12, fontWeight: '600', color: '#2563EB' },
  itemFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  date: { fontSize: 12, color: Colors.textMuted },
  fee: { fontSize: 14, fontWeight: '700', color: Colors.primary },
  joinBtn: {
    backgroundColor: Colors.primary,
    borderRadius: 8,
    padding: 10,
    alignItems: 'center',
  },
  joinBtnText: { color: Colors.white, fontWeight: '700', fontSize: 14 },
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  emptyIcon: { fontSize: 56, marginBottom: 16 },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 8,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 14,
    color: Colors.textMuted,
    textAlign: 'center',
    lineHeight: 20,
  },
});
