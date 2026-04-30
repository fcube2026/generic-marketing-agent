import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Alert,
  Linking,
  ScrollView,
  TouchableOpacity,
  AppState,
  AppStateStatus,
} from 'react-native';
import { useCameraPermissions, useMicrophonePermissions } from 'expo-camera';
import { useRoute, useNavigation, RouteProp, useFocusEffect } from '@react-navigation/native';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Colors } from '../../constants/colors';
import { Button } from '../../components/common/Button';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { videoConsultationService, VideoToken } from '../../services/videoConsultationService';
import { bookingService } from '../../services/bookingService';
import { Booking } from '../../types';
import { formatDateTime } from '../../utils/format';
import { API_BASE_URL } from '../../constants/api';
import type { PatientStackParamList } from '../../navigation/PatientNavigator';
import type { ProviderStackParamList } from '../../navigation/ProviderNavigator';

// This screen is shared between patient and provider stacks.
type RouteP = RouteProp<PatientStackParamList, 'VideoLobby'>;
type RouteV = RouteProp<ProviderStackParamList, 'VideoLobby'>;
type NavP = NativeStackNavigationProp<PatientStackParamList>;
type NavV = NativeStackNavigationProp<ProviderStackParamList>;

/** Default video consultation duration displayed in the lobby. */
const DEFAULT_DURATION_MINUTES = 15;

/** Timeout (ms) for the network connectivity probe. */
const NETWORK_CHECK_TIMEOUT_MS = 4000;

/** Checks network by attempting a lightweight request to the API base URL. */
async function checkNetworkConnectivity(): Promise<boolean> {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), NETWORK_CHECK_TIMEOUT_MS);
    await fetch(`${API_BASE_URL}/health`, {
      method: 'HEAD',
      signal: controller.signal,
    });
    clearTimeout(timer);
    return true;
  } catch {
    // Any error (network, abort, or non-OK status) is treated as disconnected
    return false;
  }
}

export const VideoLobbyScreen: React.FC = () => {
  const route = useRoute<RouteP | RouteV>();
  const navigation = useNavigation<NavP | NavV>();
  const queryClient = useQueryClient();
  const { bookingId } = route.params as { bookingId: string };

  const [cameraPermission, requestCameraPermission] = useCameraPermissions();
  const [micPermission, requestMicPermission] = useMicrophonePermissions();

  const [token, setToken] = useState<VideoToken | null>(null);
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);
  const [ending, setEnding] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [networkStatus, setNetworkStatus] = useState<boolean | null>(null);

  const appState = useRef(AppState.currentState);

  // Fetch booking info for session details
  const { data: booking } = useQuery<Booking>({
    queryKey: ['booking', bookingId],
    queryFn: () => bookingService.getBooking(bookingId),
    refetchInterval: 10000,
    staleTime: 0,
  });

  // Re-run network check and refetch booking when app returns to foreground
  useEffect(() => {
    const sub = AppState.addEventListener('change', (nextState: AppStateStatus) => {
      if (appState.current.match(/inactive|background/) && nextState === 'active') {
        runNetworkCheck();
        queryClient.invalidateQueries({ queryKey: ['booking', bookingId] });
      }
      appState.current = nextState;
    });
    return () => sub.remove();
  }, [bookingId, queryClient]);

  // Refresh booking list when screen receives focus
  useFocusEffect(
    useCallback(() => {
      queryClient.invalidateQueries({ queryKey: ['booking', bookingId] });
    }, [bookingId, queryClient]),
  );

  useEffect(() => {
    const fetchToken = async () => {
      try {
        const data = await videoConsultationService.getToken(bookingId);
        setToken(data);
      } catch (e: any) {
        setError(
          e?.response?.data?.message ??
          'Unable to prepare your video room. Make sure the booking has been accepted by the provider before joining.',
        );
      } finally {
        setLoading(false);
      }
    };
    fetchToken();
    runNetworkCheck();
  }, [bookingId]);

  const runNetworkCheck = async () => {
    setNetworkStatus(null); // Reset to "checking"
    const connected = await checkNetworkConnectivity();
    setNetworkStatus(connected);
  };

  const handleRequestPermissions = async () => {
    if (!cameraPermission?.granted) await requestCameraPermission();
    if (!micPermission?.granted) await requestMicPermission();
  };

  const handleJoin = async () => {
    if (!token) return;

    // Request permissions before joining
    if (!cameraPermission?.granted || !micPermission?.granted) {
      const camResult = await requestCameraPermission();
      const micResult = await requestMicPermission();
      if (!camResult.granted || !micResult.granted) {
        Alert.alert(
          'Permissions Required',
          'Camera and microphone access are required for video consultation. Please grant them in Settings.',
          [
            { text: 'Open Settings', onPress: () => Linking.openSettings() },
            { text: 'Cancel', style: 'cancel' },
          ],
        );
        return;
      }
    }

    setJoining(true);
    try {
      const supported = await Linking.canOpenURL(token.jitsiUrl);
      if (!supported) {
        throw new Error('Cannot open video call URL');
      }

      // Mark session and booking as IN_PROGRESS
      try {
        await videoConsultationService.startSession(bookingId);
      } catch (err) {
        if (__DEV__) console.warn('[VideoLobby] startSession failed:', err);
      }

      // Refresh booking status after starting session
      queryClient.invalidateQueries({ queryKey: ['booking', bookingId] });

      await Linking.openURL(token.jitsiUrl);
    } catch {
      Alert.alert(
        'Could Not Open Call',
        'Unable to launch the video call. Please ensure a browser app is installed and try again.',
      );
    } finally {
      setJoining(false);
    }
  };

  const handleEndConsultation = async () => {
    Alert.alert(
      'End Consultation',
      'Are you sure you want to end this consultation?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'End',
          style: 'destructive',
          onPress: async () => {
            setEnding(true);
            try {
              // Mark session and booking as COMPLETED
              try {
                await videoConsultationService.endSession(bookingId);
              } catch (err) {
                if (__DEV__) console.warn('[VideoLobby] endSession failed:', err);
              }

              // Refresh caches
              queryClient.invalidateQueries({ queryKey: ['booking', bookingId] });
              queryClient.invalidateQueries({ queryKey: ['patient-video-consultations'] });
              queryClient.invalidateQueries({ queryKey: ['provider-video-consultations'] });

              if (token?.role === 'provider') {
                (navigation as NativeStackNavigationProp<ProviderStackParamList>).navigate(
                  'ConsultationForm',
                  { bookingId },
                );
              } else {
                (navigation as NativeStackNavigationProp<PatientStackParamList>).navigate(
                  'ConsultationSummary',
                  { bookingId },
                );
              }
            } finally {
              setEnding(false);
            }
          },
        },
      ],
    );
  };

  const permissionsGranted =
    cameraPermission?.granted && micPermission?.granted;

  const isInProgress = booking?.status === 'IN_PROGRESS';

  // Disable join if network is down or not yet checked
  const joinDisabled =
    loading ||
    !!error ||
    !token ||
    networkStatus === false ||
    !permissionsGranted;

  // Participant name to display
  const participantName =
    token?.role === 'provider'
      ? booking?.patient?.name || 'Patient'
      : booking?.provider?.name || 'Doctor';

  if (loading) {
    return <LoadingSpinner fullScreen message="Preparing video room…" />;
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Header */}
      <View style={styles.headerCard}>
        <Text style={styles.headerEmoji}>📹</Text>
        <Text style={styles.headerTitle}>Video Consultation</Text>
        <Text style={styles.headerSubtitle}>
          {token?.role === 'provider'
            ? 'You are joining as the doctor'
            : 'You are joining as the patient'}
        </Text>
      </View>

      {/* Session Info */}
      {token && (
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Session Info</Text>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Session ID</Text>
            <Text style={styles.infoValue} numberOfLines={1} ellipsizeMode="middle">
              {token.roomId}
            </Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>
              {token.role === 'provider' ? 'Patient' : 'Doctor'}
            </Text>
            <Text style={styles.infoValue}>{participantName}</Text>
          </View>

          {booking?.scheduledAt && (
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Scheduled At</Text>
              <Text style={styles.infoValue}>{formatDateTime(booking.scheduledAt)}</Text>
            </View>
          )}

          <View style={[styles.infoRow, styles.infoRowLast]}>
            <Text style={styles.infoLabel}>Duration</Text>
            <Text style={styles.infoValue}>{DEFAULT_DURATION_MINUTES} minutes</Text>
          </View>
        </View>
      )}

      {/* System Checks */}
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>System Checks</Text>

        {/* Network */}
        <View style={styles.checkRow}>
          <Text style={styles.checkIcon}>
            {networkStatus === null ? '⏳' : networkStatus ? '✅' : '❌'}
          </Text>
          <View style={styles.checkInfo}>
            <Text style={styles.checkLabel}>📶 Network</Text>
            <Text style={[styles.checkStatus, networkStatus === false && styles.checkStatusFail]}>
              {networkStatus === null
                ? 'Checking…'
                : networkStatus
                ? 'Connected'
                : 'Not connected'}
            </Text>
          </View>
          {networkStatus === false && (
            <TouchableOpacity style={styles.retryBtn} onPress={runNetworkCheck}>
              <Text style={styles.retryBtnText}>Retry</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Camera */}
        <View style={styles.checkRow}>
          <Text style={styles.checkIcon}>
            {cameraPermission?.granted ? '✅' : '⚠️'}
          </Text>
          <View style={styles.checkInfo}>
            <Text style={styles.checkLabel}>📷 Camera</Text>
            <Text style={[styles.checkStatus, !cameraPermission?.granted && styles.checkStatusWarn]}>
              {cameraPermission?.granted ? 'Enabled' : 'Not granted'}
            </Text>
          </View>
        </View>

        {/* Microphone */}
        <View style={[styles.checkRow, styles.checkRowLast]}>
          <Text style={styles.checkIcon}>
            {micPermission?.granted ? '✅' : '⚠️'}
          </Text>
          <View style={styles.checkInfo}>
            <Text style={styles.checkLabel}>🎤 Microphone</Text>
            <Text style={[styles.checkStatus, !micPermission?.granted && styles.checkStatusWarn]}>
              {micPermission?.granted ? 'Enabled' : 'Not granted'}
            </Text>
          </View>
        </View>

        {!permissionsGranted && (
          <TouchableOpacity
            style={styles.permBtn}
            onPress={handleRequestPermissions}
          >
            <Text style={styles.permBtnText}>Grant Camera & Microphone Access</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* How It Works */}
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>How It Works</Text>
        <Text style={styles.infoItem}>📱 Tapping "Start / Join Call" opens the video call in your browser</Text>
        <Text style={styles.infoItem}>🔊 Make sure your volume is turned up</Text>
        <Text style={styles.infoItem}>🌐 A stable internet connection is recommended</Text>
        <Text style={styles.infoItem}>🔙 Return to this app after the call ends, then tap "End Consultation"</Text>
      </View>

      {/* Error */}
      {error && (
        <View style={styles.errorCard}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      {/* Network failure notice */}
      {networkStatus === false && (
        <View style={styles.warnCard}>
          <Text style={styles.warnText}>
            ⚠️ No internet connection detected. Please check your network before joining.
          </Text>
        </View>
      )}

      {/* Join Button */}
      <Button
        title={
          joining
            ? 'Opening call…'
            : '📹 Start / Join Call'
        }
        onPress={handleJoin}
        loading={joining}
        disabled={joinDisabled}
        style={styles.joinBtn}
      />

      {/* End Consultation Button — visible once the call has been started */}
      {isInProgress && (
        <Button
          title={ending ? 'Ending…' : '🛑 End Consultation'}
          onPress={handleEndConsultation}
          loading={ending}
          disabled={ending}
          variant="danger"
          style={styles.endBtn}
        />
      )}

      <Button
        title="Go Back"
        onPress={() => navigation.goBack()}
        variant="outline"
        style={styles.backBtn}
      />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { padding: 16, paddingBottom: 40 },
  headerCard: {
    backgroundColor: Colors.primary,
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    marginBottom: 16,
  },
  headerEmoji: { fontSize: 48, marginBottom: 8 },
  headerTitle: { fontSize: 22, fontWeight: '800', color: Colors.white, marginBottom: 4 },
  headerSubtitle: { fontSize: 14, color: 'rgba(255,255,255,0.8)', textAlign: 'center' },
  card: {
    backgroundColor: Colors.white,
    borderRadius: 12,
    padding: 16,
    marginBottom: 14,
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 12,
  },
  // Session info rows
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  infoRowLast: { borderBottomWidth: 0 },
  infoLabel: { fontSize: 13, color: Colors.textMuted, flex: 1 },
  infoValue: { fontSize: 13, fontWeight: '600', color: Colors.text, flex: 2, textAlign: 'right' },
  // System check rows
  checkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  checkRowLast: { borderBottomWidth: 0 },
  checkIcon: { fontSize: 22, marginRight: 12 },
  checkInfo: { flex: 1 },
  checkLabel: { fontSize: 15, fontWeight: '600', color: Colors.text },
  checkStatus: { fontSize: 13, color: Colors.success, marginTop: 2 },
  checkStatusFail: { color: Colors.error },
  checkStatusWarn: { color: Colors.warning },
  retryBtn: {
    backgroundColor: Colors.primaryLight,
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  retryBtnText: { color: Colors.primary, fontWeight: '700', fontSize: 12 },
  permBtn: {
    marginTop: 12,
    backgroundColor: Colors.primaryLight,
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
  },
  permBtnText: { color: Colors.primary, fontWeight: '700', fontSize: 14 },
  infoItem: { fontSize: 14, color: Colors.text, marginBottom: 8, lineHeight: 20 },
  errorCard: {
    backgroundColor: '#FEF2F2',
    borderRadius: 10,
    padding: 14,
    marginBottom: 14,
  },
  errorText: { fontSize: 14, color: Colors.error, textAlign: 'center' },
  warnCard: {
    backgroundColor: '#FFFBEB',
    borderRadius: 10,
    padding: 14,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  warnText: { fontSize: 14, color: '#92400E', textAlign: 'center' },
  joinBtn: { marginTop: 4 },
  endBtn: { marginTop: 12 },
  backBtn: { marginTop: 12 },
});

