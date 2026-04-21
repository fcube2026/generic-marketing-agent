import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
  Platform,
  Alert,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { PatientStackParamList } from '../../navigation/PatientNavigator';
import type { ProviderStackParamList } from '../../navigation/ProviderNavigator';

// ─── Route param types ────────────────────────────────────────────────────────
export type VideoCallParams = {
  bookingId: string;
  token: string;
  roomId: string;
  role: 'patient' | 'provider';
};

type PatientRoute = RouteProp<PatientStackParamList, 'VideoCall'>;
type ProviderRoute = RouteProp<ProviderStackParamList, 'VideoCall'>;
type AnyRoute = PatientRoute | ProviderRoute;

type AnyNav =
  | NativeStackNavigationProp<PatientStackParamList>
  | NativeStackNavigationProp<ProviderStackParamList>;

// ─── Mock connection quality levels ──────────────────────────────────────────
type ConnectionQuality = 'excellent' | 'good' | 'poor' | 'disconnected';

const CONNECTION_LABEL: Record<ConnectionQuality, string> = {
  excellent: '📶 Excellent',
  good: '📶 Good',
  poor: '⚠️ Poor',
  disconnected: '❌ Disconnected',
};

const CONNECTION_COLOR: Record<ConnectionQuality, string> = {
  excellent: '#22C55E',
  good: '#86EFAC',
  poor: '#F59E0B',
  disconnected: '#EF4444',
};

// Cycle through mock quality values to simulate real network fluctuation
const MOCK_QUALITY_SEQUENCE: ConnectionQuality[] = [
  'excellent',
  'excellent',
  'good',
  'excellent',
  'good',
  'poor',
  'excellent',
];

// ─── Helpers ─────────────────────────────────────────────────────────────────
function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) {
    return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  }
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

function requestPermissions(): Promise<boolean> {
  return new Promise((resolve) => {
    if (Platform.OS === 'android' || Platform.OS === 'ios') {
      Alert.alert(
        'Permissions Required',
        'This call requires access to your camera and microphone.',
        [
          {
            text: 'Deny',
            style: 'cancel',
            onPress: () => resolve(false),
          },
          {
            text: 'Allow',
            onPress: () => resolve(true),
          },
        ],
        { cancelable: false },
      );
    } else {
      resolve(true);
    }
  });
}

// ─── Component ───────────────────────────────────────────────────────────────
export const VideoCallScreen: React.FC = () => {
  const route = useRoute<AnyRoute>();
  const navigation = useNavigation<AnyNav>();
  const { bookingId, token, roomId, role } = route.params as VideoCallParams;

  // Control state
  const [isMuted, setIsMuted] = useState(false);
  const [isCameraOff, setIsCameraOff] = useState(false);
  const [isFrontCamera, setIsFrontCamera] = useState(true);
  const [seconds, setSeconds] = useState(0);
  const [connectionQuality, setConnectionQuality] = useState<ConnectionQuality>('excellent');
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(true);

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const qualityRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const qualityIdxRef = useRef(0);

  // ── Mock join sequence ──────────────────────────────────────────────────
  useEffect(() => {
    let mounted = true;

    const join = async () => {
      const granted = await requestPermissions();
      if (!mounted) return;

      if (!granted) {
        Alert.alert(
          'Permissions Denied',
          'Camera and microphone access is required for video calls.',
          [{ text: 'OK', onPress: () => navigation.goBack() }],
        );
        return;
      }

      // Simulate connecting delay (mock SDK join)
      setTimeout(() => {
        if (!mounted) return;
        setIsConnecting(false);
        setIsConnected(true);

        // Start session timer
        timerRef.current = setInterval(
          () => setSeconds((s) => s + 1),
          1000,
        );

        // Simulate connection quality fluctuation
        qualityRef.current = setInterval(() => {
          qualityIdxRef.current =
            (qualityIdxRef.current + 1) % MOCK_QUALITY_SEQUENCE.length;
          setConnectionQuality(
            MOCK_QUALITY_SEQUENCE[qualityIdxRef.current],
          );
        }, 8000);
      }, 1800);
    };

    join();

    return () => {
      mounted = false;
      if (timerRef.current) clearInterval(timerRef.current);
      if (qualityRef.current) clearInterval(qualityRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Handle network disconnection ────────────────────────────────────────
  useEffect(() => {
    if (connectionQuality === 'disconnected' && isConnected) {
      Alert.alert(
        'Connection Lost',
        'Your network connection was interrupted. Trying to reconnect…',
        [
          { text: 'End Call', onPress: handleEndCall },
          { text: 'Wait', style: 'cancel' },
        ],
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [connectionQuality]);

  const handleEndCall = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (qualityRef.current) clearInterval(qualityRef.current);
    navigation.goBack();
  }, [navigation]);

  // ── Remote peer avatar based on role ────────────────────────────────────
  const remotePeerIcon = role === 'patient' ? '👨‍⚕️' : '🙋';
  const remotePeerLabel = role === 'patient' ? 'Provider' : 'Patient';
  const selfIcon = role === 'patient' ? '🙋' : '👨‍⚕️';

  if (isConnecting) {
    return (
      <View style={styles.connectingScreen}>
        <StatusBar barStyle="light-content" backgroundColor="#0F172A" />
        <Text style={styles.connectingIcon}>📡</Text>
        <Text style={styles.connectingText}>Connecting to room…</Text>
        <Text style={styles.connectingSubtext}>
          Room: {roomId}
        </Text>
        <Text style={styles.mockBadge}>🧪 MOCK SESSION</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0F172A" />

      {/* ── Remote video tile ── */}
      <View style={styles.remoteVideo}>
        {isCameraOff ? (
          <Text style={styles.cameraOffText}>📷 Camera Off</Text>
        ) : (
          <>
            <Text style={styles.remotePeerIcon}>{remotePeerIcon}</Text>
            <Text style={styles.remotePeerLabel}>{remotePeerLabel} (Mock)</Text>
          </>
        )}
      </View>

      {/* ── Local video PiP ── */}
      <View style={styles.localVideo}>
        {isCameraOff ? (
          <Text style={styles.localCameraOffIcon}>🚫</Text>
        ) : (
          <>
            <Text style={styles.localIcon}>{selfIcon}</Text>
            <Text style={styles.localLabel}>
              {isFrontCamera ? 'Front' : 'Rear'}
            </Text>
          </>
        )}
      </View>

      {/* ── Top overlay: timer + quality ── */}
      <View style={styles.topOverlay}>
        <View style={styles.timerContainer}>
          <Text style={styles.timerText}>{formatDuration(seconds)}</Text>
        </View>
        <View style={styles.qualityContainer}>
          <Text
            style={[
              styles.qualityText,
              { color: CONNECTION_COLOR[connectionQuality] },
            ]}
          >
            {CONNECTION_LABEL[connectionQuality]}
          </Text>
        </View>
      </View>

      {/* ── Mock badge ── */}
      <View style={styles.badgeContainer}>
        <Text style={styles.mockBadge}>🧪 MOCK SESSION</Text>
        <Text style={styles.roomIdText}>Room: {roomId.slice(0, 20)}{roomId.length > 20 ? '…' : ''}</Text>
      </View>

      {/* ── Controls ── */}
      <View style={styles.controls}>
        {/* Mute */}
        <TouchableOpacity
          style={[styles.ctrlBtn, isMuted && styles.ctrlBtnActive]}
          onPress={() => setIsMuted((v) => !v)}
          accessibilityLabel={isMuted ? 'Unmute microphone' : 'Mute microphone'}
        >
          <Text style={styles.ctrlIcon}>{isMuted ? '🔇' : '🎤'}</Text>
          <Text style={styles.ctrlLabel}>{isMuted ? 'Unmute' : 'Mute'}</Text>
        </TouchableOpacity>

        {/* Camera toggle */}
        <TouchableOpacity
          style={[styles.ctrlBtn, isCameraOff && styles.ctrlBtnActive]}
          onPress={() => setIsCameraOff((v) => !v)}
          accessibilityLabel={isCameraOff ? 'Turn camera on' : 'Turn camera off'}
        >
          <Text style={styles.ctrlIcon}>{isCameraOff ? '🚫' : '📷'}</Text>
          <Text style={styles.ctrlLabel}>{isCameraOff ? 'Cam On' : 'Cam Off'}</Text>
        </TouchableOpacity>

        {/* End call */}
        <TouchableOpacity
          style={[styles.ctrlBtn, styles.endCallBtn]}
          onPress={handleEndCall}
          accessibilityLabel="End call"
        >
          <Text style={styles.ctrlIcon}>📵</Text>
          <Text style={[styles.ctrlLabel, { color: '#fff' }]}>End Call</Text>
        </TouchableOpacity>

        {/* Camera switch */}
        <TouchableOpacity
          style={styles.ctrlBtn}
          onPress={() => setIsFrontCamera((v) => !v)}
          disabled={isCameraOff}
          accessibilityLabel="Switch camera"
        >
          <Text style={[styles.ctrlIcon, isCameraOff && { opacity: 0.4 }]}>🔄</Text>
          <Text style={[styles.ctrlLabel, isCameraOff && { opacity: 0.4 }]}>
            {isFrontCamera ? 'Rear' : 'Front'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  // Connecting screen
  connectingScreen: {
    flex: 1,
    backgroundColor: '#0F172A',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  connectingIcon: { fontSize: 56, marginBottom: 16 },
  connectingText: {
    color: '#F1F5F9',
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 8,
  },
  connectingSubtext: {
    color: '#94A3B8',
    fontSize: 12,
    marginBottom: 16,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },

  // Main container
  container: {
    flex: 1,
    backgroundColor: '#0F172A',
  },

  // Remote video (full-screen background tile)
  remoteVideo: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#1E293B',
    alignItems: 'center',
    justifyContent: 'center',
  },
  remotePeerIcon: { fontSize: 96 },
  remotePeerLabel: { color: '#94A3B8', fontSize: 16, marginTop: 12 },
  cameraOffText: { color: '#94A3B8', fontSize: 18, fontWeight: '600' },

  // Local PiP (picture-in-picture)
  localVideo: {
    position: 'absolute',
    top: 60,
    right: 16,
    width: 90,
    height: 120,
    backgroundColor: '#334155',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#475569',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  localIcon: { fontSize: 32 },
  localLabel: { color: '#94A3B8', fontSize: 10, marginTop: 4 },
  localCameraOffIcon: { fontSize: 24, opacity: 0.5 },

  // Top overlay (timer + quality)
  topOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: Platform.OS === 'ios' ? 56 : 20,
    paddingHorizontal: 16,
    paddingBottom: 12,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    zIndex: 20,
  },
  timerContainer: {
    backgroundColor: 'rgba(0,0,0,0.45)',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  timerText: {
    color: '#F1F5F9',
    fontSize: 20,
    fontWeight: '700',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  qualityContainer: {
    backgroundColor: 'rgba(0,0,0,0.45)',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  qualityText: {
    fontSize: 12,
    fontWeight: '600',
  },

  // Mock badge
  badgeContainer: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 110 : 74,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 20,
  },
  mockBadge: {
    color: '#F59E0B',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.2,
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 6,
  },
  roomIdText: {
    color: '#64748B',
    fontSize: 10,
    marginTop: 4,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },

  // Controls bar
  controls: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-evenly',
    alignItems: 'center',
    paddingBottom: Platform.OS === 'ios' ? 40 : 24,
    paddingTop: 16,
    paddingHorizontal: 16,
    backgroundColor: 'rgba(15, 23, 42, 0.85)',
    zIndex: 20,
  },
  ctrlBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#334155',
  },
  ctrlBtnActive: {
    backgroundColor: '#1E3A5F',
    borderWidth: 2,
    borderColor: '#3B82F6',
  },
  endCallBtn: {
    backgroundColor: '#DC2626',
    width: 72,
    height: 72,
    borderRadius: 36,
  },
  ctrlIcon: { fontSize: 24 },
  ctrlLabel: {
    color: '#CBD5E1',
    fontSize: 10,
    marginTop: 2,
    fontWeight: '600',
  },
});
