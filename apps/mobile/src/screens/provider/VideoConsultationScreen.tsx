import React, { useState, useEffect, useRef } from 'react';
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
  const [mockCallActive, setMockCallActive] = useState(false);
  const [mockSeconds, setMockSeconds] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (mockCallActive) {
      timerRef.current = setInterval(() => setMockSeconds((s) => s + 1), 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
      setMockSeconds(0);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [mockCallActive]);

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

  const handleJoin = async () => {
    try {
      const { token, roomId } = await bookingService.getVideoToken(bookingId);
      if (token.startsWith('mock-token-')) {
        setMockCallActive(true);
        return;
      }
      const url = `https://app.100ms.live/preview/${roomId}?token=${token}`;
      Linking.openURL(url).catch(() =>
        Alert.alert('Error', 'Could not open the video call link.'),
      );
    } catch {
      Alert.alert('Error', 'Failed to get join token. Please try again.');
    }
  };

  if (mockCallActive) {
    const mins = Math.floor(mockSeconds / 60).toString().padStart(2, '0');
    const secs = (mockSeconds % 60).toString().padStart(2, '0');
    return (
      <View style={styles.mockCall}>
        <View style={styles.mockVideo}>
          <Text style={styles.mockVideoIcon}>🙋</Text>
          <Text style={styles.mockVideoLabel}>Patient (Mock)</Text>
        </View>
        <View style={styles.mockVideoSelf}>
          <Text style={styles.mockVideoSelfIcon}>👨‍⚕️</Text>
          <Text style={styles.mockVideoSelfLabel}>You</Text>
        </View>
        <Text style={styles.mockTimer}>{mins}:{secs}</Text>
        <Text style={styles.mockBadge}>🧪 MOCK SESSION</Text>
        <View style={styles.mockControls}>
          <TouchableOpacity style={styles.mockCtrlBtn}>
            <Text style={styles.mockCtrlIcon}>🎤</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.mockCtrlBtn}>
            <Text style={styles.mockCtrlIcon}>📷</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.mockCtrlBtn, styles.mockEndBtn]}
            onPress={() => setMockCallActive(false)}
          >
            <Text style={styles.mockCtrlIcon}>📵</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

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
              No video room created yet. Click "Create Video Room" to set up the 100ms session.
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
          <Text style={styles.joinButtonText}>🎥 Join Video Call (100ms)</Text>
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
  mockCall: {
    flex: 1,
    backgroundColor: '#111',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  mockVideo: {
    width: '100%',
    height: 260,
    backgroundColor: '#1E293B',
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  mockVideoIcon: { fontSize: 72 },
  mockVideoLabel: { color: '#94A3B8', marginTop: 8, fontSize: 14 },
  mockVideoSelf: {
    position: 'absolute',
    top: 60,
    right: 32,
    width: 80,
    height: 100,
    backgroundColor: '#334155',
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mockVideoSelfIcon: { fontSize: 28 },
  mockVideoSelfLabel: { color: '#94A3B8', fontSize: 10, marginTop: 4 },
  mockTimer: { color: Colors.white, fontSize: 32, fontWeight: '700', marginTop: 16 },
  mockBadge: {
    color: '#F59E0B',
    fontSize: 12,
    fontWeight: '700',
    marginTop: 6,
    letterSpacing: 1,
  },
  mockControls: {
    flexDirection: 'row',
    gap: 20,
    marginTop: 32,
  },
  mockCtrlBtn: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#334155',
    alignItems: 'center',
    justifyContent: 'center',
  },
  mockEndBtn: { backgroundColor: '#EF4444' },
  mockCtrlIcon: { fontSize: 24 },
});
