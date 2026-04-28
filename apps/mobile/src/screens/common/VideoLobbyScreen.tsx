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
  Alert,
  StatusBar,
  Linking,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { CameraView, useCameraPermissions, useMicrophonePermissions } from 'expo-camera';
import { useAuthStore } from '../../store/authStore';
import api from '../../services/api';
import { Colors } from '../../constants/colors';
import { Card } from '../../components/common/Card';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { BookingStatusBadge } from '../../components/booking/BookingStatusBadge';
import { bookingService } from '../../services/bookingService';
import { BookingStatus, VideoSessionStatus } from '../../types';
import { formatDateTime } from '../../utils/format';

export type VideoLobbyParams = { bookingId: string };

type CheckStatus = 'checking' | 'ok' | 'denied' | 'error' | 'warning';

interface PreCallCheck {
  id: string;
  label: string;
  icon: string;
  status: CheckStatus;
  message?: string;
}

const NETWORK_CHECK_URL = 'https://captive.apple.com/hotspot-detect.html';

export const VideoLobbyScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<RouteProp<{ VideoLobby: VideoLobbyParams }, 'VideoLobby'>>();
  const { bookingId } = route.params;
  const queryClient = useQueryClient();
  const currentUser = useAuthStore(state => state.user);

  // Permissions hooks
  const [cameraPermission, requestCameraPermission] = useCameraPermissions();
  const [micPermissionResponse, requestMicPermission] = useMicrophonePermissions();
  const [micPermission, setMicPermission] = useState<boolean | null>(null);

  // Component state
  const [micEnabled, setMicEnabled] = useState(true);
  const [cameraEnabled, setCameraEnabled] = useState(true);
  const [joining, setJoining] = useState(false);
  const [callStartTime, setCallStartTime] = useState<number | null>(null);
  const [ending, setEnding] = useState(false);
  const [networkOk, setNetworkOk] = useState<boolean | null>(null);
  
  const [checks, setChecks] = useState<PreCallCheck[]>([
    { id: 'camera', label: 'Camera', icon: '📷', status: 'checking' },
    { id: 'mic', label: 'Microphone', icon: '🎤', status: 'checking' },
    { id: 'network', label: 'Connection', icon: '📶', status: 'checking' },
  ]);

  // Animations
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;
  // Animated camera pulse
  const cameraAnim = useRef(new Animated.Value(0.85)).current;
  // Animated mic bars
  const micBars = useRef(
    Array.from({ length: 5 }, () => new Animated.Value(0.3)),
  ).current;

  useEffect(() => {
    // Page entrance animation
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 600, easing: Easing.out(Easing.back(1)), useNativeDriver: true }),
    ]).start();

    // Pulse animation for camera preview
    const cameraLoop = Animated.loop(
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
    );
    cameraLoop.start();

    // Mic bar animations
    const micLoops = micBars.map((bar, i) => {
      const loop = Animated.loop(
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
      );
      loop.start();
      return loop;
    });

    return () => {
      cameraLoop.stop();
      micLoops.forEach((loop) => loop.stop());
    };
  }, [cameraAnim, micBars]);

  // Run real permission and network checks
  useEffect(() => {
    let interval: NodeJS.Timeout;

    const runChecks = async () => {
      // Camera
      if (cameraPermission?.granted) {
        updateCheck('camera', 'ok', 'Camera ready');
      } else if (cameraPermission?.canAskAgain === false) {
        updateCheck('camera', 'denied', 'Permission denied');
      } else {
        const result = await requestCameraPermission();
        updateCheck('camera', result.granted ? 'ok' : 'denied');
      }

      // Mic
      try {
        if (micPermissionResponse?.granted) {
          setMicPermission(true);
          updateCheck('mic', 'ok', 'Mic ready');
        } else {
          const result = await requestMicPermission();
          setMicPermission(result.granted);
          updateCheck('mic', result.granted ? 'ok' : 'denied');
        }
      } catch {
        updateCheck('mic', 'error', 'Mic check failed');
      }

      // Network
      checkNetwork();
      interval = setInterval(checkNetwork, 10000); // Check every 10s
    };

    const checkNetwork = async () => {
      const start = Date.now();
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000);
        
        const timeoutId = setTimeout(() => controller.abort(), 5000);
        
        await api.head('/health', { signal: controller.signal });
        
        clearTimeout(timeoutId);
        const latency = Date.now() - start;
        setNetworkOk(true);

        if (latency < 400) {
          updateCheck('network', 'ok', 'Excellent (Fast)');
        } else if (latency < 1000) {
          updateCheck('network', 'warning', 'Moderate (May Lag)');
        } else {
          updateCheck('network', 'error', 'Poor (Use Audio-Only)');
        }
      } catch {
        setNetworkOk(false);
        updateCheck('network', 'denied', 'No Connection');
      }
    };

    runChecks();
    return () => clearInterval(interval);
  }, [cameraPermission, micPermissionResponse]);

  const updateCheck = (id: string, status: CheckStatus, message?: string) => {
    setChecks(prev => prev.map(c => c.id === id ? { ...c, status, message } : c));
  };

  // 2. Data Fetching
  const { data: booking, isLoading: bookingLoading, isError: bookingError } = useQuery({
    queryKey: ['booking', bookingId],
    queryFn: () => bookingService.getBookingById(bookingId),
    refetchInterval: 15000,
  });

  const { data: session, isLoading: sessionLoading } = useQuery({
    queryKey: ['video-session', bookingId],
    queryFn: async () => {
      try {
        return await bookingService.getVideoSession(bookingId);
      } catch {
        // No backend session yet — that's fine, we'll start one on Join.
        return null;
      }
    },
    retry: false,
    refetchInterval: 15000,
  });

  // 3. Readiness Logic
  const now = Date.now();
  const scheduledTime = booking?.scheduledAt ? new Date(booking.scheduledAt).getTime() : 0;
  // Allow joining up to 10 minutes early or anytime after scheduled time
  const isTimeReady = scheduledTime > 0 && now >= scheduledTime - 10 * 60 * 1000;
  const isFuture = scheduledTime > now + 10 * 60 * 1000;
  
  const permissionsOk = cameraPermission?.granted && micPermission === true;
  const sessionActive = session && ['CREATED', 'WAITING', 'IN_PROGRESS'].includes(session.status);
  const bookingReady = booking?.status === 'ACCEPTED' || booking?.status === 'IN_PROGRESS';

  // The lobby allows joining when:
  //  - permissions are granted, AND
  //  - the booking is in a joinable state, AND
  //  - either an active session exists OR we're within the join window.
  // We DO NOT block on network — the mock call works offline.
  const canJoin = !!permissionsOk && bookingReady && (sessionActive || isTimeReady) && !joining;

  // 4. Handlers
  const handleJoinCall = async (audioOnly = false) => {
    if (!canJoin) return;
    setJoining(true);

    try {
      // 1. Notify backend that the session is starting
      await bookingService.startVideoSession(bookingId).catch(() => undefined);

      // 2. Build the Jitsi URL
      const { roomId } = await bookingService.getVideoToken(bookingId);
      const isProvider = booking?.provider?.userId === currentUser?.id; 
      const displayName = isProvider ? 'Doctor' : 'Patient';
      
      // Jitsi config parameters for audio-only and prejoin bypass
      const config = [
        'config.prejoinPageEnabled=false',
        `userInfo.displayName="${encodeURIComponent(displayName)}"`,
        audioOnly ? 'config.startAudioOnly=true' : 'config.startVideoMuted=false'
      ].join('&');

      const jitsiUrl = `https://meet.jit.si/${roomId}#${config}`;

      // 3. Open in Browser
      const supported = await Linking.canOpenURL(jitsiUrl);
      if (supported) {
        await Linking.openURL(jitsiUrl);
        setCallStartTime(Date.now());
        Alert.alert(
          audioOnly ? 'Audio Consultation Started' : 'Video Consultation Started',
          'Opening Jitsi in your browser. Return here to end the consultation.',
          [{ text: 'OK' }]
        );
      } else {
        throw new Error('Could not open browser');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to start the session.');
    } finally {
      setJoining(false);
    }
  };

  const handleEndCall = async () => {
    Alert.alert(
      'End Consultation?',
      'Are you sure you want to end this consultation? This will close the session.',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Yes, End Call', 
          style: 'destructive',
          onPress: async () => {
            setJoining(true);
            try {
              const response = await bookingService.endVideoSession(bookingId).catch(() => undefined);
              
              const isProvider = booking?.provider?.userId === currentUser?.id;
              
              // Calculate duration
              let durationMinutes = 1;
              if (response && response.duration != null) {
                durationMinutes = Math.max(1, Math.round(response.duration / 60));
              } else {
                const now = Date.now();
                const start = callStartTime || now;
                const durationMs = now - start;
                durationMinutes = Math.max(1, Math.round(durationMs / 60000));
              }

              navigation.replace('PostCall', { 
                bookingId, 
                durationMinutes, 
                isProvider 
              });
            } catch (error) {
              Alert.alert('Error', 'Failed to end session.');
            } finally {
              setJoining(false);
            }
          }
        }
      ]
    );
  };

  const handleBack = () => {
    if (joining) return;
    navigation.goBack();
  };

  if (bookingLoading) return <LoadingSpinner fullScreen message="Preparing Lobby..." />;
  if (bookingError || !booking) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>⚠️ Failed to load booking details.</Text>
        <TouchableOpacity style={styles.backButton} onPress={handleBack}>
          <Text style={styles.backButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
          
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity onPress={handleBack} style={styles.iconBtn}>
              <Text style={styles.backIcon}>✕</Text>
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Video Consultation</Text>
            <View style={{ width: 40 }} />
          </View>

          {/* 1. Camera Preview Section */}
          <View style={styles.previewCard}>
            <View style={styles.previewWrapper}>
              {cameraEnabled && cameraPermission?.granted ? (
                <CameraView style={styles.camera} facing="front" />
              ) : (
                <View style={styles.cameraPlaceholder}>
                  <Text style={styles.placeholderEmoji}>{!cameraEnabled ? '📵' : '🚫'}</Text>
                  <Text style={styles.placeholderText}>
                    {!cameraEnabled ? 'Camera is turned off' : 'Camera permission required'}
                  </Text>
                </View>
              )}
              
              <View style={styles.previewOverlay}>
                <View style={styles.liveBadge}>
                  <View style={styles.liveDot} />
                  <Text style={styles.liveText}>PREVIEW</Text>
                </View>
                
                <View style={styles.micStatus}>
                  <Text style={styles.micStatusText}>{micEnabled ? '🎤 Audio Live' : '🔇 Muted'}</Text>
                </View>
              </View>
            </View>

            <View style={styles.previewControls}>
              <TouchableOpacity 
                style={[styles.controlCircle, !micEnabled && styles.controlCircleOff]} 
                onPress={() => setMicEnabled(!micEnabled)}
              >
                <Text style={styles.controlEmoji}>{micEnabled ? '🎤' : '🔇'}</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.controlCircle, !cameraEnabled && styles.controlCircleOff]} 
                onPress={() => setCameraEnabled(!cameraEnabled)}
              >
                <Text style={styles.controlEmoji}>{cameraEnabled ? '📷' : '📵'}</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* 2. Readiness & Checks */}
          <View style={styles.checksGrid}>
            {checks.map(check => (
              <View key={check.id} style={styles.checkItem}>
                <View style={[styles.checkCircle, styles[`check_${check.status}`]]}>
                  <Text style={styles.checkEmoji}>{check.status === 'ok' ? '✓' : check.status === 'denied' ? '✕' : check.status === 'warning' ? '!' : '...'}</Text>
                </View>
                <Text style={styles.checkLabel}>{check.label}</Text>
                <Text style={styles.checkSubText}>{check.message || (check.status === 'checking' ? 'Verifying...' : 'Ready')}</Text>
              </View>
            ))}
          </View>

          {/* 3. Booking Info */}
          <Card style={styles.infoCard}>
            <View style={styles.infoRow}>
              <View>
                <Text style={styles.infoLabel}>CONSULTATION WITH</Text>
                <Text style={styles.infoValue}>{booking.provider?.name || 'Medical Specialist'}</Text>
                <Text style={styles.infoSub}>{booking.serviceCategory?.name || 'General Consultation'}</Text>
              </View>
              <BookingStatusBadge status={booking.status as BookingStatus} />
            </View>
            
            <View style={styles.divider} />
            
            <View style={styles.timeBox}>
              <Text style={styles.timeLabel}>📅 SCHEDULED TIME</Text>
              <Text style={styles.timeValue}>{formatDateTime(booking.scheduledAt)}</Text>
              {isFuture && (
                <Text style={styles.countdownText}>Room opens 10 mins before start</Text>
              )}
            </View>
          </Card>

          {/* 4. Action Area */}
          <View style={styles.actionArea}>
            {!permissionsOk && (
              <TouchableOpacity style={styles.permissionBar} onPress={() => requestCameraPermission()}>
                <Text style={styles.permissionBarText}>Grant Camera Permissions to Join ➔</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={[styles.joinBtn, !canJoin && styles.joinBtnDisabled]}
              onPress={handleJoinCall}
              disabled={!canJoin}
            >
              {joining ? (
                <Text style={styles.joinBtnText}>Joining Session...</Text>
              ) : (
                <Text style={styles.joinBtnText}>
                  {!permissionsOk ? 'Grant Camera & Mic Access' :
                   !bookingReady ? 'Booking Not Confirmed' :
                   isFuture ? 'Not Ready — Opens 10 min Before' :
                   sessionActive ? 'Join Consultation Now' : 'Start Session Now'}
                </Text>
              )}
            </TouchableOpacity>

            {/* Audio Only Option */}
            {canJoin && (
              <TouchableOpacity
                style={[styles.audioOnlyBtn, joining && { opacity: 0.5 }]}
                onPress={() => handleJoinCall(true)}
                disabled={joining}
              >
                <Text style={styles.audioOnlyBtnText}>🎙 Join as Audio Only (Better for Weak Signal)</Text>
              </TouchableOpacity>
            )}

            {/* End Call Button */}
            {sessionActive && (
              <TouchableOpacity
                style={[styles.endBtn, joining && { opacity: 0.5 }]}
                onPress={handleEndCall}
                disabled={joining}
              >
                <Text style={styles.endBtnText}>🏁 End Consultation</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity style={styles.cancelLink} onPress={handleBack}>
              <Text style={styles.cancelLinkText}>Cancel & Return to Dashboard</Text>
            </TouchableOpacity>
          </View>

        </Animated.View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0F172A' },
  scrollContent: { paddingBottom: 40 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'ios' ? 50 : 20,
    paddingBottom: 20,
  },
  headerTitle: { color: '#fff', fontSize: 18, fontWeight: '700' },
  iconBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#1E293B', alignItems: 'center', justifyContent: 'center' },
  backIcon: { color: '#94A3B8', fontSize: 18, fontWeight: '300' },

  // Preview
  previewCard: { marginHorizontal: 20, marginBottom: 24 },
  previewWrapper: {
    height: 300,
    borderRadius: 24,
    backgroundColor: '#1E293B',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#334155',
  },
  camera: { flex: 1 },
  cameraPlaceholder: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  placeholderEmoji: { fontSize: 60, marginBottom: 12 },
  placeholderText: { color: '#94A3B8', fontSize: 14, fontWeight: '500' },
  previewOverlay: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    padding: 16,
    justifyContent: 'space-between',
  },
  liveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  liveDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#EF4444', marginRight: 6 },
  liveText: { color: '#fff', fontSize: 11, fontWeight: '800' },
  micStatus: {
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    alignSelf: 'flex-end',
  },
  micStatusText: { color: '#94A3B8', fontSize: 11, fontWeight: '600' },
  previewControls: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 20,
    marginTop: -30,
    zIndex: 10,
  },
  controlCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#3B82F6',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 8,
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 10,
  },
  controlCircleOff: { backgroundColor: '#EF4444' },
  controlEmoji: { fontSize: 24 },

  // Checks
  checksGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  checkItem: { alignItems: 'center', flex: 1 },
  checkCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  checkEmoji: { color: '#fff', fontWeight: '900', fontSize: 16 },
  checkLabel: { color: '#fff', fontSize: 12, fontWeight: '600', marginBottom: 2 },
  checkSubText: { color: '#64748B', fontSize: 10, textAlign: 'center' },
  check_ok: { backgroundColor: '#10B981' },
  check_denied: { backgroundColor: '#EF4444' },
  check_warning: { backgroundColor: '#F59E0B' },
  check_checking: { backgroundColor: '#334155' },
  check_error: { backgroundColor: '#EF4444' },

  // Info Card
  infoCard: { marginHorizontal: 20, padding: 20, backgroundColor: '#1E293B', borderColor: '#334155' },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  infoLabel: { color: '#64748B', fontSize: 10, fontWeight: '800', letterSpacing: 1, marginBottom: 4 },
  infoValue: { color: '#fff', fontSize: 20, fontWeight: '700' },
  infoSub: { color: '#3B82F6', fontSize: 14, fontWeight: '600', marginTop: 2 },
  divider: { height: 1, backgroundColor: '#334155', marginVertical: 16 },
  timeBox: { alignItems: 'center' },
  timeLabel: { color: '#64748B', fontSize: 10, fontWeight: '800', letterSpacing: 1, marginBottom: 8 },
  timeValue: { color: '#E2E8F0', fontSize: 16, fontWeight: '600' },
  countdownText: { color: '#F59E0B', fontSize: 12, marginTop: 4, fontWeight: '600' },

  // Action
  actionArea: { paddingHorizontal: 20, marginTop: 10 },
  permissionBar: {
    backgroundColor: '#F59E0B22',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#F59E0B',
    marginBottom: 16,
    alignItems: 'center',
  },
  permissionBarText: { color: '#F59E0B', fontWeight: '700', fontSize: 13 },
  joinBtn: {
    backgroundColor: '#3B82F6',
    borderRadius: 18,
    paddingVertical: 20,
    alignItems: 'center',
    shadowColor: '#3B82F6',
    shadowOpacity: 0.4,
    shadowRadius: 15,
    elevation: 10,
  },
  joinBtnDisabled: { backgroundColor: '#334155', shadowOpacity: 0, elevation: 0 },
  joinBtnText: { color: '#fff', fontSize: 16, fontWeight: '800' },
  audioOnlyBtn: {
    marginTop: 12,
    backgroundColor: 'rgba(59, 130, 246, 0.05)',
    borderRadius: 18,
    paddingVertical: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.3)',
  },
  audioOnlyBtnText: { color: '#3B82F6', fontSize: 14, fontWeight: '600' },
  endBtn: {
    marginTop: 16,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderRadius: 18,
    paddingVertical: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#EF4444',
  },
  endBtnText: { color: '#EF4444', fontSize: 15, fontWeight: '700' },
  cancelLink: { marginTop: 20, alignItems: 'center' },
  cancelLinkText: { color: '#64748B', fontSize: 14, fontWeight: '600', textDecorationLine: 'underline' },

  // Errors
  errorContainer: { flex: 1, backgroundColor: '#0F172A', alignItems: 'center', justifyContent: 'center', padding: 40 },
  errorText: { color: '#fff', fontSize: 16, textAlign: 'center', marginBottom: 24 },
  backButton: { padding: 16, backgroundColor: '#1E293B', borderRadius: 12 },
  backButtonText: { color: '#fff', fontWeight: '600' },
});
