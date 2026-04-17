import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Linking } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import { Colors } from '../../constants/colors';
import { Card } from '../../components/common/Card';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { BookingStatusBadge } from '../../components/booking/BookingStatusBadge';
import { bookingService } from '../../services/bookingService';
import { PatientStackParamList } from '../../navigation/PatientNavigator';
import { BookingStatus, VideoSessionStatus } from '../../types';
import { formatDateTime, formatCurrency } from '../../utils/format';

type Props = {
  navigation: NativeStackNavigationProp<PatientStackParamList, 'VideoConsultation'>;
  route: RouteProp<PatientStackParamList, 'VideoConsultation'>;
};

const SESSION_STATUS_LABEL: Record<VideoSessionStatus, string> = {
  CREATED: '🕐 Session Created',
  WAITING: '⏳ Waiting for Provider',
  IN_PROGRESS: '🔴 Live',
  COMPLETED: '✅ Completed',
  FAILED: '❌ Failed',
  EXPIRED: '⌛ Expired',
};

const SESSION_STATUS_COLOR: Record<VideoSessionStatus, string> = {
  CREATED: Colors.textMuted,
  WAITING: '#F59E0B',
  IN_PROGRESS: Colors.error,
  COMPLETED: Colors.success,
  FAILED: Colors.error,
  EXPIRED: Colors.textMuted,
};

export const VideoConsultationScreen: React.FC<Props> = ({ navigation, route }) => {
  const { bookingId } = route.params;

  const { data: booking, isLoading: bookingLoading } = useQuery({
    queryKey: ['booking', bookingId],
    queryFn: () => bookingService.getBookingById(bookingId),
  });

  const { data: session, isLoading: sessionLoading } = useQuery({
    queryKey: ['video-session', bookingId],
    queryFn: () => bookingService.getVideoSession(bookingId),
    retry: false,
  });

  if (bookingLoading || sessionLoading) {
    return <LoadingSpinner fullScreen message="Loading video session..." />;
  }

  const canJoin =
    session &&
    session.status === 'IN_PROGRESS';

  const handleJoin = () => {
    if (session?.roomId) {
      const url = `https://meet.jit.si/${session.roomId}`;
      Linking.openURL(url).catch(() => {});
    }
  };

  return (
    <ScrollView style={styles.container}>
      {/* Booking info */}
      <Card style={styles.card}>
        <Text style={styles.sectionTitle}>Booking Details</Text>
        <View style={styles.row}>
          <Text style={styles.label}>Provider</Text>
          <Text style={styles.value}>{booking?.provider?.name || '—'}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Service</Text>
          <Text style={styles.value}>{booking?.serviceCategory?.name || '—'}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Scheduled</Text>
          <Text style={styles.value}>{booking ? formatDateTime(booking.scheduledAt) : '—'}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Fee</Text>
          <Text style={styles.value}>{booking ? formatCurrency(booking.totalFee) : '—'}</Text>
        </View>
        {booking && (
          <View style={[styles.row, { borderBottomWidth: 0 }]}>
            <Text style={styles.label}>Status</Text>
            <BookingStatusBadge status={booking.status as BookingStatus} />
          </View>
        )}
      </Card>

      {/* Video session info */}
      <Card style={styles.card}>
        <Text style={styles.sectionTitle}>📹 Video Session</Text>
        {!session ? (
          <View style={styles.noSession}>
            <Text style={styles.noSessionIcon}>🎥</Text>
            <Text style={styles.noSessionText}>
              The video session will be created once the provider accepts your booking.
            </Text>
          </View>
        ) : (
          <>
            <View style={styles.row}>
              <Text style={styles.label}>Session Status</Text>
              <Text
                style={[
                  styles.value,
                  { color: SESSION_STATUS_COLOR[session.status as VideoSessionStatus] },
                ]}
              >
                {SESSION_STATUS_LABEL[session.status as VideoSessionStatus] || session.status}
              </Text>
            </View>
            {session.startedAt && (
              <View style={styles.row}>
                <Text style={styles.label}>Started</Text>
                <Text style={styles.value}>{formatDateTime(session.startedAt)}</Text>
              </View>
            )}
            {session.endedAt && (
              <View style={styles.row}>
                <Text style={styles.label}>Ended</Text>
                <Text style={styles.value}>{formatDateTime(session.endedAt)}</Text>
              </View>
            )}
            {session.duration != null && (
              <View style={[styles.row, { borderBottomWidth: 0 }]}>
                <Text style={styles.label}>Duration</Text>
                <Text style={styles.value}>
                  {Math.floor(session.duration / 60)}m {session.duration % 60}s
                </Text>
              </View>
            )}
          </>
        )}
      </Card>

      {/* Join button */}
      {canJoin && (
        <TouchableOpacity style={styles.joinButton} onPress={handleJoin}>
          <Text style={styles.joinButtonText}>🎥 Join Video Call</Text>
        </TouchableOpacity>
      )}

      <TouchableOpacity
        style={styles.backButton}
        onPress={() => navigation.goBack()}
      >
        <Text style={styles.backButtonText}>← Back</Text>
      </TouchableOpacity>

      <View style={{ height: 32 }} />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  card: { margin: 16, marginBottom: 0 },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 14,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  label: { fontSize: 14, color: Colors.textMuted },
  value: { fontSize: 14, fontWeight: '600', color: Colors.text, flex: 1, textAlign: 'right' },
  noSession: { alignItems: 'center', paddingVertical: 20 },
  noSessionIcon: { fontSize: 40, marginBottom: 12 },
  noSessionText: {
    fontSize: 14,
    color: Colors.textMuted,
    textAlign: 'center',
    lineHeight: 20,
  },
  joinButton: {
    margin: 16,
    marginTop: 20,
    backgroundColor: Colors.primary,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  joinButtonText: { color: Colors.white, fontSize: 16, fontWeight: '700' },
  backButton: {
    marginHorizontal: 16,
    marginTop: 12,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: Colors.border,
    paddingVertical: 14,
    alignItems: 'center',
  },
  backButtonText: { color: Colors.textMuted, fontSize: 15, fontWeight: '600' },
});
