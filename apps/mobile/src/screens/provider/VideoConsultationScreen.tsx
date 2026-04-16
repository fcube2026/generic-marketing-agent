import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Linking,
  Alert,
} from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRoute, useNavigation, RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Colors } from '../../constants/colors';
import { Card } from '../../components/common/Card';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { bookingService } from '../../services/bookingService';
import { VideoSessionStatus, BookingStatus } from '../../types';
import { formatDateTime, formatCurrency } from '../../utils/format';
import { BookingStatusBadge } from '../../components/booking/BookingStatusBadge';
import type { ProviderStackParamList } from '../../navigation/ProviderNavigator';

type Route = RouteProp<ProviderStackParamList, 'VideoConsultation'>;
type Nav = NativeStackNavigationProp<ProviderStackParamList>;

const SESSION_STATUS_LABEL: Record<VideoSessionStatus, string> = {
  CREATED: '🕐 Session Created',
  WAITING: '⏳ Waiting',
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

export const VideoConsultationScreen: React.FC = () => {
  const route = useRoute<Route>();
  const navigation = useNavigation<Nav>();
  const queryClient = useQueryClient();
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

  const statusMutation = useMutation({
    mutationFn: (status: string) => bookingService.updateStatus(bookingId, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['booking', bookingId] });
      queryClient.invalidateQueries({ queryKey: ['video-session', bookingId] });
    },
    onError: () => Alert.alert('Error', 'Failed to update booking status.'),
  });

  if (bookingLoading || sessionLoading) {
    return <LoadingSpinner fullScreen message="Loading video session..." />;
  }

  const canJoin =
    session &&
    (session.status === 'WAITING' || session.status === 'IN_PROGRESS') &&
    session.sessionToken;

  const handleJoin = () => {
    if (session?.sessionToken) {
      const url = `https://meet.curex24.com/room/${session.roomId}?token=${session.sessionToken}`;
      Linking.openURL(url).catch(() => {});
    }
  };

  const getNextAction = () => {
    switch (booking?.status) {
      case 'ACCEPTED':
        return { label: '▶️ Start Consultation', next: 'IN_PROGRESS' };
      case 'IN_PROGRESS':
        return { label: '✅ Complete Consultation', next: 'COMPLETED' };
      default:
        return null;
    }
  };

  const nextAction = getNextAction();

  return (
    <ScrollView style={styles.container}>
      {/* Booking info */}
      <Card style={styles.card}>
        <Text style={styles.sectionTitle}>Booking Details</Text>
        <View style={styles.row}>
          <Text style={styles.label}>Patient</Text>
          <Text style={styles.value}>{booking?.patient?.name || '—'}</Text>
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
              The video session will be available once the booking is accepted.
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

      {/* Status action */}
      {nextAction && (
        <TouchableOpacity
          style={[styles.actionButton, statusMutation.isPending && { opacity: 0.7 }]}
          onPress={() => statusMutation.mutate(nextAction.next)}
          disabled={statusMutation.isPending}
        >
          <Text style={styles.actionButtonText}>
            {statusMutation.isPending ? 'Updating…' : nextAction.label}
          </Text>
        </TouchableOpacity>
      )}

      <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
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
  actionButton: {
    marginHorizontal: 16,
    marginTop: 12,
    backgroundColor: Colors.success,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  actionButtonText: { color: Colors.white, fontSize: 16, fontWeight: '700' },
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
