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
      <View style={styles.headerRow}>
        <Text style={styles.header}>📹 Video Consultations</Text>
        <TouchableOpacity
          style={styles.newBtn}
          onPress={() =>
            navigation.navigate('SelectService', {
              category: {
                id: 'video-consultation',
                name: 'Video Consultation',
                slug: 'video-consultation',
                description: 'Consult a doctor online from anywhere',
              },
            })
          }
        >
          <Text style={styles.newBtnText}>+ New</Text>
        </TouchableOpacity>
      </View>

      {!bookings || bookings.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyIcon}>📹</Text>
          <Text style={styles.emptyTitle}>No active bookings currently available</Text>
          <Text style={styles.emptySubtitle}>
            Book a video consultation to connect with a doctor online
          </Text>
          <TouchableOpacity
            style={styles.bookBtn}
            onPress={() =>
              navigation.navigate('SelectService', {
                category: {
                  id: 'video-consultation',
                  name: 'Video Consultation',
                  slug: 'video-consultation',
                  description: 'Consult a doctor online from anywhere',
                },
              })
            }
          >
            <Text style={styles.bookBtnText}>Book Now</Text>
          </TouchableOpacity>
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
  header: { fontSize: 22, fontWeight: '800', color: Colors.text },
  newBtn: {
    backgroundColor: Colors.primary,
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  newBtnText: { color: Colors.white, fontWeight: '700', fontSize: 14 },
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
    marginBottom: 24,
    lineHeight: 20,
  },
  bookBtn: {
    backgroundColor: Colors.primary,
    borderRadius: 12,
    paddingHorizontal: 32,
    paddingVertical: 14,
  },
  bookBtnText: { color: Colors.white, fontWeight: '700', fontSize: 16 },
});
