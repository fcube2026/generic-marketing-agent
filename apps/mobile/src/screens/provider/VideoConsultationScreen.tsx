import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
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
import { SESSION_STATUS_LABEL, SESSION_STATUS_COLOR } from '../../constants/videoConsultation';
import { BookingStatusBadge } from '../../components/booking/BookingStatusBadge';
import type { ProviderStackParamList } from '../../navigation/ProviderNavigator';

type Route = RouteProp<ProviderStackParamList, 'VideoConsultation'>;
type Nav = NativeStackNavigationProp<ProviderStackParamList>;


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

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['booking', bookingId] });
    queryClient.invalidateQueries({ queryKey: ['video-session', bookingId] });
  };

  const createRoomMutation = useMutation({
    mutationFn: () => bookingService.createVideoRoom(bookingId),
    onSuccess: invalidate,
    onError: () => Alert.alert('Error', 'Failed to create video room.'),
  });

  const endMutation = useMutation({
    mutationFn: () => bookingService.endVideoSession(bookingId),
    onSuccess: invalidate,
    onError: () => Alert.alert('Error', 'Failed to end video session.'),
  });

  if (bookingLoading || sessionLoading) {
    return <LoadingSpinner fullScreen message="Loading video session..." />;
  }

  const sessionExists = Boolean(session);
  const isActive = session && ['CREATED', 'WAITING', 'IN_PROGRESS'].includes(session.status);
  const isMutating = createRoomMutation.isPending || endMutation.isPending;

  const handleJoin = () => {
    navigation.navigate('VideoLobby', { bookingId });
  };

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
              No video room created yet. Click "Create Video Room" to set up the session.
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
            {session.roomId ? (
              <View style={styles.row}>
                <Text style={styles.label}>Room</Text>
                <Text style={[styles.value, { fontSize: 12 }]}>{session.roomId}</Text>
              </View>
            ) : null}
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

      {/* Action buttons */}
      {!sessionExists && (
        <TouchableOpacity
          style={[styles.createButton, isMutating && { opacity: 0.7 }]}
          onPress={() => createRoomMutation.mutate()}
          disabled={isMutating}
        >
          <Text style={styles.createButtonText}>
            {createRoomMutation.isPending ? 'Creating…' : '▶️ Create Video Room'}
          </Text>
        </TouchableOpacity>
      )}

      {isActive && (
        <TouchableOpacity style={styles.joinButton} onPress={handleJoin}>
          <Text style={styles.joinButtonText}>🎥 Join Video Call</Text>
        </TouchableOpacity>
      )}

      {isActive && (
        <TouchableOpacity
          style={[styles.endButton, isMutating && { opacity: 0.7 }]}
          onPress={() => endMutation.mutate()}
          disabled={isMutating}
        >
          <Text style={styles.endButtonText}>
            {endMutation.isPending ? 'Ending…' : '✅ End Consultation'}
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
  createButton: {
    margin: 16,
    marginTop: 20,
    backgroundColor: Colors.primary,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  createButtonText: { color: Colors.white, fontSize: 16, fontWeight: '700' },
  joinButton: {
    marginHorizontal: 16,
    marginTop: 12,
    backgroundColor: Colors.primary,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  joinButtonText: { color: Colors.white, fontSize: 16, fontWeight: '700' },
  endButton: {
    marginHorizontal: 16,
    marginTop: 12,
    backgroundColor: Colors.success,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  endButtonText: { color: Colors.white, fontSize: 16, fontWeight: '700' },
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
