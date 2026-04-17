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
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Colors } from '../../constants/colors';
import { Card } from '../../components/common/Card';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { bookingService } from '../../services/bookingService';
import { VideoSession, VideoSessionStatus } from '../../types';
import { formatDateTime } from '../../utils/format';
import { ProviderStackParamList } from '../../navigation/ProviderNavigator';

type Nav = NativeStackNavigationProp<ProviderStackParamList>;

const SESSION_STATUS_LABEL: Record<VideoSessionStatus, string> = {
  CREATED: '🕐 Created',
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

export const InstantMeetingScreen: React.FC = () => {
  const navigation = useNavigation<Nav>();
  const queryClient = useQueryClient();

  const { data: sessions = [], isLoading } = useQuery<VideoSession[]>({
    queryKey: ['my-video-sessions'],
    queryFn: bookingService.getMyVideoSessions,
  });

  const createMutation = useMutation({
    mutationFn: bookingService.startStandaloneInstantSession,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-video-sessions'] });
    },
    onError: () => Alert.alert('Error', 'Failed to create instant meeting.'),
  });

  const handleJoin = (roomId: string) => {
    const url = `https://meet.jit.si/${roomId}`;
    Linking.openURL(url).catch(() =>
      Alert.alert('Error', 'Could not open the video call link.'),
    );
  };

  const activeSession = sessions.find((s) => s.status === 'IN_PROGRESS');

  if (isLoading) return <LoadingSpinner fullScreen message="Loading sessions…" />;

  return (
    <ScrollView style={styles.container}>
      {/* Start Instant Meeting */}
      <Card style={styles.card}>
        <Text style={styles.sectionTitle}>⚡ Instant Meeting</Text>
        <Text style={styles.description}>
          Start an ad-hoc video session instantly — no booking required. Share
          the room link with your patient.
        </Text>
        <TouchableOpacity
          style={[styles.startBtn, createMutation.isPending && { opacity: 0.7 }]}
          onPress={() => createMutation.mutate()}
          disabled={createMutation.isPending}
        >
          <Text style={styles.startBtnText}>
            {createMutation.isPending ? 'Creating…' : '▶️ Start New Meeting'}
          </Text>
        </TouchableOpacity>
      </Card>

      {/* Active session banner */}
      {activeSession && (
        <Card style={[styles.card, styles.activeCard]}>
          <Text style={styles.activeBadge}>🔴 LIVE SESSION</Text>
          <Text style={styles.roomText}>{activeSession.roomId}</Text>
          {activeSession.startedAt && (
            <Text style={styles.timeMeta}>
              Started: {formatDateTime(activeSession.startedAt)}
            </Text>
          )}
          <TouchableOpacity
            style={styles.joinBtn}
            onPress={() => handleJoin(activeSession.roomId)}
          >
            <Text style={styles.joinBtnText}>🎥 Join Video Call (Jitsi)</Text>
          </TouchableOpacity>
        </Card>
      )}

      {/* Session history */}
      {sessions.length > 0 && (
        <View style={styles.historySection}>
          <Text style={styles.historyTitle}>📋 Session History</Text>
          {sessions.map((session) => (
            <Card key={session.id} style={styles.sessionCard}>
              <View style={styles.sessionRow}>
                <Text style={styles.roomLabel}>{session.roomId}</Text>
                <Text
                  style={[
                    styles.statusBadge,
                    { color: SESSION_STATUS_COLOR[session.status as VideoSessionStatus] },
                  ]}
                >
                  {SESSION_STATUS_LABEL[session.status as VideoSessionStatus] || session.status}
                </Text>
              </View>
              {session.startedAt && (
                <Text style={styles.sessionMeta}>
                  Started: {formatDateTime(session.startedAt)}
                </Text>
              )}
              {session.duration != null && (
                <Text style={styles.sessionMeta}>
                  Duration: {Math.floor(session.duration / 60)}m {session.duration % 60}s
                </Text>
              )}
              {session.status === 'IN_PROGRESS' && (
                <TouchableOpacity
                  style={styles.joinSmallBtn}
                  onPress={() => handleJoin(session.roomId)}
                >
                  <Text style={styles.joinSmallBtnText}>Join →</Text>
                </TouchableOpacity>
              )}
            </Card>
          ))}
        </View>
      )}

      {sessions.length === 0 && (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyIcon}>🎥</Text>
          <Text style={styles.emptyTitle}>No Sessions Yet</Text>
          <Text style={styles.emptySubtitle}>
            Tap "Start New Meeting" above to begin an instant video session.
          </Text>
        </View>
      )}

      <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
        <Text style={styles.backBtnText}>← Back</Text>
      </TouchableOpacity>

      <View style={{ height: 32 }} />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  card: { margin: 16, marginBottom: 0 },
  sectionTitle: { fontSize: 17, fontWeight: '700', color: Colors.text, marginBottom: 8 },
  description: { fontSize: 14, color: Colors.textMuted, lineHeight: 20, marginBottom: 16 },
  startBtn: {
    backgroundColor: '#7C3AED',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  startBtnText: { color: Colors.white, fontSize: 16, fontWeight: '700' },
  activeCard: { borderLeftWidth: 4, borderLeftColor: Colors.error },
  activeBadge: { fontSize: 12, fontWeight: '700', color: Colors.error, marginBottom: 6 },
  roomText: { fontSize: 13, color: Colors.text, fontWeight: '600', marginBottom: 4 },
  timeMeta: { fontSize: 12, color: Colors.textMuted, marginBottom: 12 },
  joinBtn: {
    backgroundColor: Colors.primary,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  joinBtnText: { color: Colors.white, fontSize: 15, fontWeight: '700' },
  historySection: { margin: 16, marginBottom: 0 },
  historyTitle: { fontSize: 16, fontWeight: '700', color: Colors.text, marginBottom: 10 },
  sessionCard: { marginBottom: 10 },
  sessionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  roomLabel: { fontSize: 13, color: Colors.text, flex: 1, fontWeight: '600' },
  statusBadge: { fontSize: 13, fontWeight: '700' },
  sessionMeta: { fontSize: 12, color: Colors.textMuted, marginTop: 2 },
  joinSmallBtn: { marginTop: 8, alignSelf: 'flex-end' },
  joinSmallBtnText: { color: Colors.primary, fontWeight: '700', fontSize: 13 },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 60,
    paddingHorizontal: 32,
  },
  emptyIcon: { fontSize: 56, marginBottom: 12 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: Colors.text, marginBottom: 6 },
  emptySubtitle: {
    fontSize: 14,
    color: Colors.textMuted,
    textAlign: 'center',
    lineHeight: 20,
  },
  backBtn: {
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: Colors.border,
    paddingVertical: 14,
    alignItems: 'center',
  },
  backBtnText: { color: Colors.textMuted, fontSize: 15, fontWeight: '600' },
});
