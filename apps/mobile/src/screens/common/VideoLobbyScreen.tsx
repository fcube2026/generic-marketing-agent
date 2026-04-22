import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Animated,
  Easing,
  Platform,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { useQuery } from '@tanstack/react-query';
import { Camera } from 'expo-camera';
import { Audio } from 'expo-av';
import { Colors } from '../../constants/colors';
import { Card } from '../../components/common/Card';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { BookingStatusBadge } from '../../components/booking/BookingStatusBadge';
import { bookingService } from '../../services/bookingService';
import { BookingStatus, VideoSessionStatus } from '../../types';
import { formatDateTime } from '../../utils/format';

export type VideoLobbyParams = { bookingId: string };

type CheckStatus = 'checking' | 'ok' | 'denied' | 'error';

interface PreCallCheck {
  label: string;
  icon: string;
  status: CheckStatus;
}

/** URL used for the network connectivity check in the lobby pre-call flow */
const NETWORK_CHECK_URL = 'https://www.google.com';

const SESSION_STATUS_COLOR: Record<VideoSessionStatus, string> = {
  CREATED: Colors.textMuted,
  WAITING: '#F59E0B',
  IN_PROGRESS: Colors.error,
  COMPLETED: Colors.success,
  FAILED: Colors.error,
  EXPIRED: Colors.textMuted,
};

const SESSION_STATUS_LABEL: Record<VideoSessionStatus, string> = {
  CREATED: '🕐 Session Created',
  WAITING: '⏳ Waiting',
  IN_PROGRESS: '🔴 Live',
  COMPLETED: '✅ Completed',
  FAILED: '❌ Failed',
  EXPIRED: '⌛ Expired',
};

const CHECK_STATUS_COLOR: Record<CheckStatus, string> = {
  checking: '#F59E0B',
  ok: Colors.success,
  denied: Colors.error,
  error: Colors.error,
};

const CHECK_STATUS_ICON: Record<CheckStatus, string> = {
  checking: '⏳',
  ok: '✅',
  denied: '❌',
  error: '⚠️',
};

export const VideoLobbyScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<RouteProp<{ VideoLobby: VideoLobbyParams }, 'VideoLobby'>>();
  const { bookingId } = route.params;

  const [micEnabled, setMicEnabled] = useState(true);
  const [cameraEnabled, setCameraEnabled] = useState(true);
  const [checks, setChecks] = useState<PreCallCheck[]>([
    { label: 'Camera Permission', icon: '📷', status: 'checking' },
    { label: 'Microphone Permission', icon: '🎤', status: 'checking' },
    { label: 'Network Connectivity', icon: '📶', status: 'checking' },
  ]);

  // Animated camera pulse
  const cameraAnim = useRef(new Animated.Value(0.85)).current;
  // Animated mic bars
  const micBars = useRef(
    Array.from({ length: 5 }, () => new Animated.Value(0.3)),
  ).current;

  useEffect(() => {
    // Pulse animation for camera preview
    Animated.loop(
      Animated.sequence([
        Animated.timing(cameraAnim, {
          toValue: 1,
          duration: 1200,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(cameraAnim, {
          toValue: 0.85,
          duration: 1200,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ]),
    ).start();

    // Mic bar animations
    micBars.forEach((bar, i) => {
      Animated.loop(
        Animated.sequence([
          Animated.delay(i * 120),
          Animated.timing(bar, {
            toValue: 0.9,
            duration: 400 + i * 80,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(bar, {
            toValue: 0.2,
            duration: 400 + i * 80,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ]),
      ).start();
    });
  }, [cameraAnim, micBars]);

  // Run real permission and network checks
  useEffect(() => {
    let cancelled = false;

    const setCheck = (idx: number, status: CheckStatus) => {
      if (!cancelled) {
        setChecks((prev) =>
          prev.map((c, i) => (i === idx ? { ...c, status } : c)),
        );
      }
    };

    const runChecks = async () => {
      // Camera permission check
      try {
        // On web or environments where Camera module isn't available, fall back gracefully
        if (Platform.OS !== 'web' && Camera?.requestCameraPermissionsAsync) {
          const { status } = await Camera.requestCameraPermissionsAsync();
          setCheck(0, status === 'granted' ? 'ok' : 'denied');
        } else {
          setCheck(0, 'ok');
        }
      } catch {
        setCheck(0, 'error');
      }

      // Microphone permission check
      try {
        if (Platform.OS !== 'web' && Audio?.requestPermissionsAsync) {
          const { status } = await Audio.requestPermissionsAsync();
          setCheck(1, status === 'granted' ? 'ok' : 'denied');
        } else {
          setCheck(1, 'ok');
        }
      } catch {
        setCheck(1, 'error');
      }

      // Network connectivity check
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000);
        await fetch(NETWORK_CHECK_URL, { signal: controller.signal, method: 'HEAD' });
        clearTimeout(timeoutId);
        setCheck(2, 'ok');
      } catch {
        setCheck(2, 'error');
      }
    };

    runChecks();

    return () => {
      cancelled = true;
    };
  }, []);

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
    return <LoadingSpinner fullScreen message="Preparing lobby..." />;
  }

  const allChecksOk = checks.every((c) => c.status === 'ok');
  const canJoin =
    allChecksOk &&
    session &&
    ['CREATED', 'WAITING', 'IN_PROGRESS'].includes(session.status);

  const handleJoinCall = () => {
    navigation.navigate('VideoConsultation', { bookingId });
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Camera Preview */}
      <View style={styles.previewContainer}>
        {cameraEnabled ? (
          <Animated.View
            style={[styles.cameraPreview, { transform: [{ scale: cameraAnim }] }]}
          >
            <Text style={styles.cameraIcon}>🙋</Text>
            <Text style={styles.cameraLabel}>Camera Preview</Text>
            <Text style={styles.cameraSub}>Your video is on</Text>
          </Animated.View>
        ) : (
          <View style={[styles.cameraPreview, styles.cameraOff]}>
            <Text style={styles.cameraIcon}>🚫</Text>
            <Text style={styles.cameraLabel}>Camera Off</Text>
          </View>
        )}

        {/* Self preview badge */}
        <View style={styles.selfBadge}>
          <Text style={styles.selfBadgeText}>You</Text>
        </View>

        {/* Mic level indicator */}
        {micEnabled && (
          <View style={styles.micIndicator}>
            {micBars.map((bar, i) => (
              <Animated.View
                key={i}
                style={[
                  styles.micBar,
                  { transform: [{ scaleY: bar }] },
                ]}
              />
            ))}
          </View>
        )}
      </View>

      {/* Device Controls */}
      <View style={styles.controls}>
        <TouchableOpacity
          style={[styles.controlBtn, !micEnabled && styles.controlBtnOff]}
          onPress={() => setMicEnabled((v) => !v)}
          accessibilityLabel={micEnabled ? 'Mute microphone' : 'Unmute microphone'}
        >
          <Text style={styles.controlIcon}>{micEnabled ? '🎤' : '🔇'}</Text>
          <Text style={styles.controlLabel}>{micEnabled ? 'Mic On' : 'Mic Off'}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.controlBtn, !cameraEnabled && styles.controlBtnOff]}
          onPress={() => setCameraEnabled((v) => !v)}
          accessibilityLabel={cameraEnabled ? 'Turn camera off' : 'Turn camera on'}
        >
          <Text style={styles.controlIcon}>{cameraEnabled ? '📷' : '📵'}</Text>
          <Text style={styles.controlLabel}>{cameraEnabled ? 'Cam On' : 'Cam Off'}</Text>
        </TouchableOpacity>
      </View>

      {/* Pre-call Checks */}
      <Card style={styles.card}>
        <Text style={styles.sectionTitle}>🔍 Pre-call Checks</Text>
        {checks.map((check) => (
          <View key={check.label} style={styles.checkRow}>
            <Text style={styles.checkIcon}>{check.icon}</Text>
            <Text style={styles.checkLabel}>{check.label}</Text>
            <Text style={[styles.checkStatus, { color: CHECK_STATUS_COLOR[check.status] }]}>
              {CHECK_STATUS_ICON[check.status]}{' '}
              {check.status === 'checking' ? 'Checking…' : check.status === 'ok' ? 'Ready' : 'Issue'}
            </Text>
          </View>
        ))}
      </Card>

      {/* Booking Details */}
      <Card style={styles.card}>
        <Text style={styles.sectionTitle}>📋 Booking Details</Text>
        {booking ? (
          <>
            {booking.provider && (
              <View style={styles.row}>
                <Text style={styles.label}>Provider</Text>
                <Text style={styles.value}>{booking.provider.name}</Text>
              </View>
            )}
            {booking.serviceCategory && (
              <View style={styles.row}>
                <Text style={styles.label}>Service</Text>
                <Text style={styles.value}>{booking.serviceCategory.name}</Text>
              </View>
            )}
            <View style={styles.row}>
              <Text style={styles.label}>Scheduled</Text>
              <Text style={styles.value}>{formatDateTime(booking.scheduledAt)}</Text>
            </View>
            <View style={[styles.row, { borderBottomWidth: 0 }]}>
              <Text style={styles.label}>Status</Text>
              <BookingStatusBadge status={booking.status as BookingStatus} />
            </View>
          </>
        ) : (
          <Text style={styles.noData}>Booking details unavailable</Text>
        )}
      </Card>

      {/* Session Status */}
      {session && (
        <Card style={styles.card}>
          <Text style={styles.sectionTitle}>📹 Session Status</Text>
          <View style={styles.row}>
            <Text style={styles.label}>Status</Text>
            <Text
              style={[
                styles.value,
                { color: SESSION_STATUS_COLOR[session.status as VideoSessionStatus] },
              ]}
            >
              {SESSION_STATUS_LABEL[session.status as VideoSessionStatus] || session.status}
            </Text>
          </View>
          {!['CREATED', 'WAITING', 'IN_PROGRESS'].includes(session.status) && (
            <View style={[styles.row, { borderBottomWidth: 0 }]}>
              <Text style={styles.waitingNote}>
                ⏳ Waiting for the session to become active…
              </Text>
            </View>
          )}
        </Card>
      )}

      {!session && (
        <Card style={styles.card}>
          <View style={styles.noSession}>
            <Text style={styles.noSessionIcon}>🎥</Text>
            <Text style={styles.noSessionText}>
              The video room will be ready once the provider sets up the session.
            </Text>
          </View>
        </Card>
      )}

      {/* Join Call Button */}
      <TouchableOpacity
        style={[styles.joinButton, !canJoin && styles.joinButtonDisabled]}
        onPress={handleJoinCall}
        disabled={!canJoin}
        accessibilityLabel="Join video call"
      >
        <Text style={styles.joinButtonText}>
          {!allChecksOk ? '⏳ Running checks…' : canJoin ? '🎥 Join Call' : '🔒 Session Not Ready'}
        </Text>
      </TouchableOpacity>

      {!allChecksOk && (
        <Text style={styles.checksNote}>
          Please wait while we verify your device and connection.
        </Text>
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
  container: { flex: 1, backgroundColor: '#0F172A' },
  content: { paddingTop: 16 },

  // Camera preview
  previewContainer: {
    marginHorizontal: 16,
    marginBottom: 16,
    height: 220,
    borderRadius: 16,
    backgroundColor: '#1E293B',
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  cameraPreview: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  cameraOff: { opacity: 0.5 },
  cameraIcon: { fontSize: 64 },
  cameraLabel: { color: '#94A3B8', fontSize: 16, fontWeight: '600', marginTop: 8 },
  cameraSub: { color: '#64748B', fontSize: 12, marginTop: 4 },
  selfBadge: {
    position: 'absolute',
    bottom: 12,
    left: 12,
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  selfBadgeText: { color: Colors.white, fontSize: 12, fontWeight: '600' },
  micIndicator: {
    position: 'absolute',
    bottom: 12,
    right: 12,
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 3,
    height: 24,
  },
  micBar: {
    width: 4,
    height: 20,
    backgroundColor: Colors.success,
    borderRadius: 2,
  },

  // Controls
  controls: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 24,
    marginBottom: 20,
    paddingHorizontal: 16,
  },
  controlBtn: {
    width: 80,
    height: 70,
    borderRadius: 14,
    backgroundColor: '#1E293B',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  controlBtnOff: {
    backgroundColor: '#EF4444',
  },
  controlIcon: { fontSize: 24 },
  controlLabel: { color: Colors.white, fontSize: 11, fontWeight: '600' },

  // Cards
  card: {
    marginHorizontal: 16,
    marginBottom: 12,
    backgroundColor: Colors.white,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 12,
  },

  // Check rows
  checkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  checkIcon: { fontSize: 18, marginRight: 10 },
  checkLabel: { flex: 1, fontSize: 14, color: Colors.text },
  checkStatus: { fontSize: 13, fontWeight: '600' },

  // Booking rows
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 9,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  label: { fontSize: 14, color: Colors.textMuted },
  value: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
    flex: 1,
    textAlign: 'right',
  },
  noData: { fontSize: 14, color: Colors.textMuted, textAlign: 'center', paddingVertical: 12 },

  // Session
  waitingNote: {
    fontSize: 13,
    color: '#F59E0B',
    flex: 1,
    paddingVertical: 4,
  },
  noSession: { alignItems: 'center', paddingVertical: 16 },
  noSessionIcon: { fontSize: 36, marginBottom: 10 },
  noSessionText: {
    fontSize: 13,
    color: Colors.textMuted,
    textAlign: 'center',
    lineHeight: 20,
  },

  // Join button
  joinButton: {
    marginHorizontal: 16,
    marginTop: 8,
    backgroundColor: Colors.primary,
    borderRadius: 14,
    paddingVertical: 17,
    alignItems: 'center',
  },
  joinButtonDisabled: {
    backgroundColor: '#334155',
  },
  joinButtonText: { color: Colors.white, fontSize: 16, fontWeight: '700' },
  checksNote: {
    fontSize: 12,
    color: '#94A3B8',
    textAlign: 'center',
    marginTop: 8,
    marginHorizontal: 16,
  },

  // Back button
  backButton: {
    marginHorizontal: 16,
    marginTop: 12,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#334155',
    paddingVertical: 14,
    alignItems: 'center',
  },
  backButtonText: { color: '#94A3B8', fontSize: 15, fontWeight: '600' },
});
