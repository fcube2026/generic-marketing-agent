import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Alert,
  Linking,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { useCameraPermissions, useMicrophonePermissions } from 'expo-camera';
import { useRoute, useNavigation, RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Colors } from '../../constants/colors';
import { Button } from '../../components/common/Button';
import { videoConsultationService, VideoToken } from '../../services/videoConsultationService';
import type { PatientStackParamList } from '../../navigation/PatientNavigator';
import type { ProviderStackParamList } from '../../navigation/ProviderNavigator';

// This screen is shared between patient and provider stacks.
type RouteP = RouteProp<PatientStackParamList, 'VideoLobby'>;
type RouteV = RouteProp<ProviderStackParamList, 'VideoLobby'>;
type NavP = NativeStackNavigationProp<PatientStackParamList>;
type NavV = NativeStackNavigationProp<ProviderStackParamList>;

export const VideoLobbyScreen: React.FC = () => {
  const route = useRoute<RouteP | RouteV>();
  const navigation = useNavigation<NavP | NavV>();
  const { bookingId } = route.params as { bookingId: string };

  const [cameraPermission, requestCameraPermission] = useCameraPermissions();
  const [micPermission, requestMicPermission] = useMicrophonePermissions();

  const [token, setToken] = useState<VideoToken | null>(null);
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
  }, [bookingId]);

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

  const permissionsGranted =
    cameraPermission?.granted && micPermission?.granted;

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

      {/* Permission Status */}
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Device Check</Text>

        <View style={styles.permRow}>
          <Text style={styles.permIcon}>
            {cameraPermission?.granted ? '✅' : '⚠️'}
          </Text>
          <View style={styles.permInfo}>
            <Text style={styles.permLabel}>Camera</Text>
            <Text style={styles.permStatus}>
              {cameraPermission?.granted ? 'Granted' : 'Not granted'}
            </Text>
          </View>
        </View>

        <View style={styles.permRow}>
          <Text style={styles.permIcon}>
            {micPermission?.granted ? '✅' : '⚠️'}
          </Text>
          <View style={styles.permInfo}>
            <Text style={styles.permLabel}>Microphone</Text>
            <Text style={styles.permStatus}>
              {micPermission?.granted ? 'Granted' : 'Not granted'}
            </Text>
          </View>
        </View>

        {!permissionsGranted && (
          <TouchableOpacity
            style={styles.permBtn}
            onPress={handleRequestPermissions}
          >
            <Text style={styles.permBtnText}>Grant Permissions</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Info Card */}
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>How It Works</Text>
        <Text style={styles.infoItem}>📱 Tapping "Join Call" opens the video call in your browser</Text>
        <Text style={styles.infoItem}>🔊 Make sure your volume is turned up</Text>
        <Text style={styles.infoItem}>🌐 A stable internet connection is recommended</Text>
        <Text style={styles.infoItem}>🔙 Return to this app after the call ends</Text>
      </View>

      {/* Error */}
      {error && (
        <View style={styles.errorCard}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      {/* Room info (debug / reference) */}
      {token && (
        <View style={styles.roomCard}>
          <Text style={styles.roomLabel}>Room ID</Text>
          <Text style={styles.roomId} numberOfLines={1} ellipsizeMode="middle">
            {token.roomId}
          </Text>
        </View>
      )}

      {/* Join Button */}
      <Button
        title={
          loading
            ? 'Preparing room…'
            : joining
            ? 'Opening call…'
            : '📹 Join Video Call'
        }
        onPress={handleJoin}
        loading={loading || joining}
        disabled={loading || !!error || !token}
        style={styles.joinBtn}
      />

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
  permRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  permIcon: { fontSize: 22, marginRight: 12 },
  permInfo: { flex: 1 },
  permLabel: { fontSize: 15, fontWeight: '600', color: Colors.text },
  permStatus: { fontSize: 13, color: Colors.textMuted, marginTop: 2 },
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
  roomCard: {
    backgroundColor: Colors.background,
    borderRadius: 8,
    padding: 12,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  roomLabel: { fontSize: 11, fontWeight: '700', color: Colors.textMuted, marginBottom: 4, textTransform: 'uppercase' },
  roomId: { fontSize: 13, color: Colors.text, fontFamily: 'monospace' },
  joinBtn: { marginTop: 4 },
  backBtn: { marginTop: 12 },
});
