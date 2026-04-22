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
import {
  HMSSDK,
  HMSConfig,
  HMSUpdateListenerActions,
  HmsViewComponent,
  HMSVideoViewMode,
} from '@100mslive/react-native-hms';
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

// ─── Call state ───────────────────────────────────────────────────────────────
type CallState =
  | 'connecting'
  | 'connected'
  | 'reconnecting'
  | 'error'
  | 'ended';

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

/** Returns true if the token looks like a mock token from the backend's mock mode */
function isMockToken(token: string): boolean {
  return token.startsWith('mock-token-');
}

const MAX_ROOM_ID_DISPLAY_LENGTH = 20;

// ─── Mock UI (used when VIDEO_MOCK_MODE=true on the backend) ─────────────────
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

  const remotePeerIcon = role === 'patient' ? '👨‍⚕️' : '🙋';
  const remotePeerLabel = role === 'patient' ? 'Provider' : 'Patient';
  const selfIcon = role === 'patient' ? '🙋' : '👨‍⚕️';

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0F172A" />

      {/* Remote video tile */}
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

      {/* Local video PiP */}
      <View style={styles.localVideo}>
        {isCameraOff ? (
          <Text style={styles.localCameraOffIcon}>🚫</Text>
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
        <Text style={styles.mockBadge}>🧪 MOCK SESSION</Text>
        <Text style={styles.roomIdText}>
          Room: {roomId.slice(0, MAX_ROOM_ID_DISPLAY_LENGTH)}
          {roomId.length > MAX_ROOM_ID_DISPLAY_LENGTH ? '…' : ''}
        </Text>
      </View>

      {/* Controls */}
      <View style={styles.controls}>
        <TouchableOpacity
          style={[styles.ctrlBtn, isMuted && styles.ctrlBtnActive]}
          onPress={() => setIsMuted((v) => !v)}
          accessibilityLabel={isMuted ? 'Unmute microphone' : 'Mute microphone'}
        >
          <Text style={styles.ctrlIcon}>{isMuted ? '🔇' : '🎤'}</Text>
          <Text style={styles.ctrlLabel}>{isMuted ? 'Unmute' : 'Mute'}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.ctrlBtn, isCameraOff && styles.ctrlBtnActive]}
          onPress={() => setIsCameraOff((v) => !v)}
          accessibilityLabel={isCameraOff ? 'Turn camera on' : 'Turn camera off'}
        >
          <Text style={styles.ctrlIcon}>{isCameraOff ? '🚫' : '📷'}</Text>
          <Text style={styles.ctrlLabel}>{isCameraOff ? 'Cam On' : 'Cam Off'}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.ctrlBtn, styles.endCallBtn]}
          onPress={onEndCall}
          accessibilityLabel="End call"
        >
          <Text style={styles.ctrlIcon}>📵</Text>
          <Text style={[styles.ctrlLabel, { color: '#fff' }]}>End Call</Text>
        </TouchableOpacity>

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

// ─── Real HMS Call Screen ─────────────────────────────────────────────────────
const HMSCallScreen: React.FC<{
  token: string;
  roomId: string;
  role: 'patient' | 'provider';
  onEndCall: () => void;
}> = ({ token, roomId, role, onEndCall }) => {
  const [callState, setCallState] = useState<CallState>('connecting');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isCameraOff, setIsCameraOff] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [localTrackId, setLocalTrackId] = useState<string | null>(null);
  const [remoteTrackId, setRemoteTrackId] = useState<string | null>(null);
  const [remotePeerName, setRemotePeerName] = useState<string>('');

  const hmsInstanceRef = useRef<HMSSDK | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const mountedRef = useRef(true);

  // Build the HMS SDK instance and join the room
  useEffect(() => {
    mountedRef.current = true;

    const setupAndJoin = async () => {
      try {
        const hmsInstance = await HMSSDK.build();
        hmsInstanceRef.current = hmsInstance;

        // Listen for successful join
        hmsInstance.addEventListener(HMSUpdateListenerActions.ON_JOIN, ({ room }: any) => {
          if (!mountedRef.current) return;
          setCallState('connected');
          timerRef.current = setInterval(() => setSeconds((s) => s + 1), 1000);

          // Capture local video track ID from local peer
          const localPeer = room?.localPeer;
          const localVideoTrack = localPeer?.videoTrack;
          if (localVideoTrack?.trackId) {
            setLocalTrackId(localVideoTrack.trackId);
          }
        });

        // Listen for peer join/leave to update remote video
        hmsInstance.addEventListener(HMSUpdateListenerActions.ON_PEER_UPDATE, ({ peer, type }: any) => {
          if (!mountedRef.current) return;
          // type 1 = PEER_JOINED, type 2 = PEER_LEFT
          if (type === 1) {
            setRemotePeerName(peer?.name ?? '');
          }
        });

        // Listen for track updates to grab remote video track IDs
        hmsInstance.addEventListener(HMSUpdateListenerActions.ON_TRACK_UPDATE, ({ track, type, peer }: any) => {
          if (!mountedRef.current) return;
          const isVideo = track?.type === 'VIDEO';
          const isLocal = peer?.isLocal;
          // type 1 = TRACK_ADDED
          if (type === 1 && isVideo) {
            if (isLocal) {
              setLocalTrackId(track.trackId);
            } else {
              setRemoteTrackId(track.trackId);
              setRemotePeerName(peer?.name ?? '');
            }
          }
          // type 2 = TRACK_REMOVED
          if (type === 2 && isVideo && !isLocal) {
            setRemoteTrackId(null);
          }
        });

        // Error handling
        hmsInstance.addEventListener(HMSUpdateListenerActions.ON_ERROR, (error: any) => {
          if (!mountedRef.current) return;
          const msg = error?.message ?? 'An error occurred during the video call.';
          setErrorMessage(msg);
          setCallState('error');
        });

        // Reconnection handling
        hmsInstance.addEventListener(HMSUpdateListenerActions.RECONNECTING, () => {
          if (!mountedRef.current) return;
          setCallState('reconnecting');
        });
        hmsInstance.addEventListener(HMSUpdateListenerActions.RECONNECTED, () => {
          if (!mountedRef.current) return;
          setCallState('connected');
        });

        // Removed from room (e.g. host ends call)
        hmsInstance.addEventListener(HMSUpdateListenerActions.ON_REMOVED_FROM_ROOM, () => {
          if (!mountedRef.current) return;
          cleanup();
          onEndCall();
        });

        const username = role === 'provider' ? 'Provider' : 'Patient';
        const config = new HMSConfig({ username, authToken: token });
        await hmsInstance.join(config);
      } catch (err: any) {
        if (!mountedRef.current) return;
        const message = err?.message ?? 'Failed to connect to the video room.';
        setErrorMessage(message);
        setCallState('error');
      }
    };

    setupAndJoin();

    return () => {
      mountedRef.current = false;
      cleanup();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const cleanup = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    const instance = hmsInstanceRef.current;
    if (instance) {
      instance.removeAllListeners();
      instance.leave().catch(() => {/* ignore leave errors on cleanup */});
      hmsInstanceRef.current = null;
    }
  }, []);

  const handleEndCall = useCallback(async () => {
    cleanup();
    onEndCall();
  }, [cleanup, onEndCall]);

  const handleToggleMute = useCallback(async () => {
    const instance = hmsInstanceRef.current;
    if (!instance) return;
    try {
      const localPeer = await instance.getLocalPeer();
      const audioTrack = localPeer?.localAudioTrack?.();
      if (audioTrack) {
        const newMuted = !isMuted;
        audioTrack.setMute(newMuted);
        setIsMuted(newMuted);
      }
    } catch {/* ignore */}
  }, [isMuted]);

  const handleToggleCamera = useCallback(async () => {
    const instance = hmsInstanceRef.current;
    if (!instance) return;
    try {
      const localPeer = await instance.getLocalPeer();
      const videoTrack = localPeer?.localVideoTrack?.();
      if (videoTrack) {
        const newCameraOff = !isCameraOff;
        videoTrack.setMute(newCameraOff);
        setIsCameraOff(newCameraOff);
      }
    } catch {/* ignore */}
  }, [isCameraOff]);

  const handleFlipCamera = useCallback(async () => {
    const instance = hmsInstanceRef.current;
    if (!instance) return;
    try {
      const localPeer = await instance.getLocalPeer();
      const videoTrack = localPeer?.localVideoTrack?.();
      if (videoTrack) {
        videoTrack.switchCamera();
      }
    } catch {/* ignore */}
  }, []);

  // ── Connecting state ─────────────────────────────────────────────────────
  if (callState === 'connecting') {
    return (
      <View style={styles.connectingScreen}>
        <StatusBar barStyle="light-content" backgroundColor="#0F172A" />
        <Text style={styles.connectingIcon}>📡</Text>
        <Text style={styles.connectingText}>Connecting to room…</Text>
        <Text style={styles.connectingSubtext}>
          Room: {roomId.slice(0, MAX_ROOM_ID_DISPLAY_LENGTH)}
          {roomId.length > MAX_ROOM_ID_DISPLAY_LENGTH ? '…' : ''}
        </Text>
      </View>
    );
  }

  // ── Reconnecting state ───────────────────────────────────────────────────
  if (callState === 'reconnecting') {
    return (
      <View style={styles.connectingScreen}>
        <StatusBar barStyle="light-content" backgroundColor="#0F172A" />
        <Text style={styles.connectingIcon}>🔄</Text>
        <Text style={styles.connectingText}>Reconnecting…</Text>
        <Text style={styles.connectingSubtext}>Please wait while we restore the connection.</Text>
        <TouchableOpacity style={styles.errorEndBtn} onPress={handleEndCall}>
          <Text style={styles.errorEndBtnText}>End Call</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // ── Error state ──────────────────────────────────────────────────────────
  if (callState === 'error') {
    return (
      <View style={styles.connectingScreen}>
        <StatusBar barStyle="light-content" backgroundColor="#0F172A" />
        <Text style={styles.connectingIcon}>⚠️</Text>
        <Text style={styles.connectingText}>Connection Error</Text>
        <Text style={styles.connectingSubtext}>{errorMessage}</Text>
        <TouchableOpacity style={styles.errorEndBtn} onPress={handleEndCall}>
          <Text style={styles.errorEndBtnText}>Return</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // ── Connected state ──────────────────────────────────────────────────────
  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0F172A" />

      {/* Remote video (full-screen background) */}
      <View style={styles.remoteVideo}>
        {remoteTrackId ? (
          <HmsViewComponent
            trackId={remoteTrackId}
            id={`remote-${remoteTrackId}`}
            style={StyleSheet.absoluteFillObject}
            scaleType={HMSVideoViewMode.ASPECT_FILL}
          />
        ) : (
          <>
            <Text style={styles.remotePeerIcon}>
              {role === 'patient' ? '👨‍⚕️' : '🙋'}
            </Text>
            <Text style={styles.remotePeerLabel}>
              {remotePeerName || (role === 'patient' ? 'Provider' : 'Patient')} • Waiting…
            </Text>
          </>
        )}
      </View>

      {/* Local video PiP */}
      <View style={styles.localVideo}>
        {localTrackId && !isCameraOff ? (
          <HmsViewComponent
            trackId={localTrackId}
            id={`local-${localTrackId}`}
            style={{ flex: 1, borderRadius: 10 }}
            mirror
            scaleType={HMSVideoViewMode.ASPECT_FILL}
          />
        ) : (
          <>
            <Text style={styles.localIcon}>
              {role === 'patient' ? '🙋' : '👨‍⚕️'}
            </Text>
            <Text style={styles.localLabel}>
              {isCameraOff ? 'Cam Off' : 'You'}
            </Text>
          </>
        )}
      </View>

      {/* Top overlay: timer */}
      <View style={styles.topOverlay}>
        <View style={styles.timerContainer}>
          <Text style={styles.timerText}>{formatDuration(seconds)}</Text>
        </View>
        {remotePeerName ? (
          <View style={styles.peerNameContainer}>
            <Text style={styles.peerNameText}>{remotePeerName}</Text>
          </View>
        ) : null}
      </View>

      {/* Controls */}
      <View style={styles.controls}>
        <TouchableOpacity
          style={[styles.ctrlBtn, isMuted && styles.ctrlBtnActive]}
          onPress={handleToggleMute}
          accessibilityLabel={isMuted ? 'Unmute microphone' : 'Mute microphone'}
        >
          <Text style={styles.ctrlIcon}>{isMuted ? '🔇' : '🎤'}</Text>
          <Text style={styles.ctrlLabel}>{isMuted ? 'Unmute' : 'Mute'}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.ctrlBtn, isCameraOff && styles.ctrlBtnActive]}
          onPress={handleToggleCamera}
          accessibilityLabel={isCameraOff ? 'Turn camera on' : 'Turn camera off'}
        >
          <Text style={styles.ctrlIcon}>{isCameraOff ? '🚫' : '📷'}</Text>
          <Text style={styles.ctrlLabel}>{isCameraOff ? 'Cam On' : 'Cam Off'}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.ctrlBtn, styles.endCallBtn]}
          onPress={handleEndCall}
          accessibilityLabel="End call"
        >
          <Text style={styles.ctrlIcon}>📵</Text>
          <Text style={[styles.ctrlLabel, { color: '#fff' }]}>End Call</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.ctrlBtn}
          onPress={handleFlipCamera}
          disabled={isCameraOff}
          accessibilityLabel="Switch camera"
        >
          <Text style={[styles.ctrlIcon, isCameraOff && { opacity: 0.4 }]}>🔄</Text>
          <Text style={[styles.ctrlLabel, isCameraOff && { opacity: 0.4 }]}>Flip</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

// ─── Root component — routes to mock or real based on token ──────────────────
export const VideoCallScreen: React.FC = () => {
  const route = useRoute<AnyRoute>();
  const navigation = useNavigation<AnyNav>();
  const { bookingId: _bookingId, token, roomId, role } = route.params as VideoCallParams;

  const handleEndCall = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  // If the backend is in mock mode, the token starts with "mock-token-"
  if (isMockToken(token)) {
    return <MockCallScreen roomId={roomId} role={role} onEndCall={handleEndCall} />;
  }

  return (
    <HMSCallScreen
      token={token}
      roomId={roomId}
      role={role}
      onEndCall={handleEndCall}
    />
  );
};

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  // Connecting / error screen
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
    textAlign: 'center',
  },
  connectingSubtext: {
    color: '#94A3B8',
    fontSize: 13,
    marginBottom: 24,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    textAlign: 'center',
  },
  errorEndBtn: {
    backgroundColor: '#DC2626',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 32,
  },
  errorEndBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },

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
    overflow: 'hidden',
  },
  localIcon: { fontSize: 32 },
  localLabel: { color: '#94A3B8', fontSize: 10, marginTop: 4 },
  localCameraOffIcon: { fontSize: 24, opacity: 0.5 },

  // Top overlay
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
  peerNameContainer: {
    backgroundColor: 'rgba(0,0,0,0.45)',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  peerNameText: {
    color: '#F1F5F9',
    fontSize: 13,
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
