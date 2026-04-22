import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
  Platform,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { PatientStackParamList } from '../../navigation/PatientNavigator';
import type { ProviderStackParamList } from '../../navigation/ProviderNavigator';
import { bookingService } from '../../services/bookingService';
import { useQueryClient } from '@tanstack/react-query';

// --- Route param types -------------------------------------------------------
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

// --- Helpers -----------------------------------------------------------------
function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) {
    return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  }
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

const MAX_ROOM_ID_DISPLAY_LENGTH = 20;

// --- Mock UI (the only supported video path; 100ms removed) ------------------
const MockCallScreen: React.FC<{
  roomId: string;
  role: 'patient' | 'provider';
  onEndCall: () => void;
}> = ({ roomId, role, onEndCall }) => {
  const [isMuted, setIsMuted] = useState(false);
  const [isCameraOff, setIsCameraOff] = useState(false);
  const [isFrontCamera, setIsFrontCamera] = useState(true);
  const [seconds, setSeconds] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    timerRef.current = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const remotePeerIcon = role === 'patient' ? '\uD83D\uDC68\u200D\u2695\uFE0F' : '\uD83D\uDE4B';
  const remotePeerLabel = role === 'patient' ? 'Provider' : 'Patient';
  const selfIcon = role === 'patient' ? '\uD83D\uDE4B' : '\uD83D\uDC68\u200D\u2695\uFE0F';

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0F172A" />

      {/* Remote video tile */}
      <View style={styles.remoteVideo}>
        {isCameraOff ? (
          <Text style={styles.cameraOffText}>Camera Off</Text>
        ) : (
          <>
            <Text style={styles.remotePeerIcon}>{remotePeerIcon}</Text>
            <Text style={styles.remotePeerLabel}>{remotePeerLabel} (Mock)</Text>
          </>
        )}
      </View>

      {/* Local video PiP */}
      <View style={styles.localVideo}>
        {isCameraOff ? (
          <Text style={styles.localCameraOffIcon}>X</Text>
        ) : (
          <>
            <Text style={styles.localIcon}>{selfIcon}</Text>
            <Text style={styles.localLabel}>{isFrontCamera ? 'Front' : 'Rear'}</Text>
          </>
        )}
      </View>

      {/* Top overlay */}
      <View style={styles.topOverlay}>
        <View style={styles.timerContainer}>
          <Text style={styles.timerText}>{formatDuration(seconds)}</Text>
        </View>
      </View>

      {/* Mock badge */}
      <View style={styles.badgeContainer}>
        <Text style={styles.mockBadge}>MOCK SESSION</Text>
        <Text style={styles.roomIdText}>
          Room: {roomId.slice(0, MAX_ROOM_ID_DISPLAY_LENGTH)}
          {roomId.length > MAX_ROOM_ID_DISPLAY_LENGTH ? '...' : ''}
        </Text>
      </View>

      {/* Controls */}
      <View style={styles.controls}>
        <TouchableOpacity
          style={[styles.ctrlBtn, isMuted && styles.ctrlBtnActive]}
          onPress={() => setIsMuted((v) => !v)}
          accessibilityLabel={isMuted ? 'Unmute microphone' : 'Mute microphone'}
        >
          <Text style={styles.ctrlIcon}>{isMuted ? 'Mute' : 'Mic'}</Text>
          <Text style={styles.ctrlLabel}>{isMuted ? 'Unmute' : 'Mute'}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.ctrlBtn, isCameraOff && styles.ctrlBtnActive]}
          onPress={() => setIsCameraOff((v) => !v)}
          accessibilityLabel={isCameraOff ? 'Turn camera on' : 'Turn camera off'}
        >
          <Text style={styles.ctrlIcon}>{isCameraOff ? 'Off' : 'Cam'}</Text>
          <Text style={styles.ctrlLabel}>{isCameraOff ? 'Cam On' : 'Cam Off'}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.ctrlBtn, styles.endCallBtn]}
          onPress={onEndCall}
          accessibilityLabel="End call"
        >
          <Text style={styles.ctrlIcon}>End</Text>
          <Text style={[styles.ctrlLabel, { color: '#fff' }]}>End Call</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.ctrlBtn}
          onPress={() => setIsFrontCamera((v) => !v)}
          disabled={isCameraOff}
          accessibilityLabel="Switch camera"
        >
          <Text style={[styles.ctrlIcon, isCameraOff && { opacity: 0.4 }]}>Flip</Text>
          <Text style={[styles.ctrlLabel, isCameraOff && { opacity: 0.4 }]}>
            {isFrontCamera ? 'Rear' : 'Front'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

// --- Root component (always renders the mock UI) -----------------------------
export const VideoCallScreen: React.FC = () => {
  const route = useRoute<AnyRoute>();
  const navigation = useNavigation<AnyNav>();
  const queryClient = useQueryClient();
  const { bookingId, roomId, role } = route.params as VideoCallParams;

  const handleEndCall = useCallback(async () => {
    try {
      await bookingService.endVideoSession(bookingId);
      // Invalidate all booking/session queries so lists update immediately
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['video-session', bookingId] }),
        queryClient.invalidateQueries({ queryKey: ['booking', bookingId] }),
        queryClient.invalidateQueries({ queryKey: ['patient-bookings'] }),
        queryClient.invalidateQueries({ queryKey: ['provider-bookings'] }),
        queryClient.invalidateQueries({ queryKey: ['provider-bookings-history'] }),
      ]);
    } catch {
      // Best-effort — navigate back even if the API call fails
    } finally {
      navigation.goBack();
    }
  }, [bookingId, navigation, queryClient]);

  return <MockCallScreen roomId={roomId} role={role} onEndCall={handleEndCall} />;
};

// --- Styles ------------------------------------------------------------------
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F172A',
  },
  remoteVideo: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#1E293B',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cameraOffText: {
    color: '#94A3B8',
    fontSize: 16,
  },
  remotePeerIcon: {
    fontSize: 96,
    marginBottom: 12,
  },
  remotePeerLabel: {
    color: '#E2E8F0',
    fontSize: 16,
    fontWeight: '600',
  },
  localVideo: {
    position: 'absolute',
    top: 64,
    right: 16,
    width: 110,
    height: 160,
    backgroundColor: '#334155',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#0F172A',
    overflow: 'hidden',
    zIndex: 5,
  },
  localCameraOffIcon: {
    fontSize: 28,
    color: '#94A3B8',
  },
  localIcon: {
    fontSize: 36,
    marginBottom: 4,
  },
  localLabel: {
    color: '#CBD5F5',
    fontSize: 11,
    fontWeight: '600',
  },
  topOverlay: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 56 : 32,
    left: 16,
    flexDirection: 'row',
    alignItems: 'center',
    zIndex: 4,
  },
  timerContainer: {
    backgroundColor: 'rgba(15, 23, 42, 0.7)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
  },
  timerText: {
    color: '#F8FAFC',
    fontWeight: '700',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  badgeContainer: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 56 : 32,
    alignSelf: 'center',
    alignItems: 'center',
    zIndex: 3,
  },
  mockBadge: {
    backgroundColor: '#F59E0B',
    color: '#0F172A',
    fontWeight: '700',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    overflow: 'hidden',
    fontSize: 12,
  },
  roomIdText: {
    color: '#94A3B8',
    fontSize: 11,
    marginTop: 4,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  controls: {
    position: 'absolute',
    bottom: 32,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: 16,
    zIndex: 6,
  },
  ctrlBtn: {
    backgroundColor: 'rgba(30, 41, 59, 0.85)',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 16,
    alignItems: 'center',
    minWidth: 72,
  },
  ctrlBtnActive: {
    backgroundColor: '#475569',
  },
  ctrlIcon: {
    fontSize: 14,
    color: '#F1F5F9',
    fontWeight: '700',
    marginBottom: 4,
  },
  ctrlLabel: {
    fontSize: 11,
    color: '#CBD5F5',
    fontWeight: '600',
  },
  endCallBtn: {
    backgroundColor: '#DC2626',
  },
});
