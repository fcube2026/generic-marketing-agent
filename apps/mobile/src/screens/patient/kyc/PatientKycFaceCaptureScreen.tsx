import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  Alert,
  Linking,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Colors } from '../../../constants/colors';
import { Button } from '../../../components/common/Button';
import { Card } from '../../../components/common/Card';
import {
  verificationService,
  SelfServeStatus,
} from '../../../services/verificationService';
import { PatientStackParamList } from '../../../navigation/PatientNavigator';

type Nav = NativeStackNavigationProp<PatientStackParamList, 'PatientKycFaceCapture'>;
type Props = { navigation: Nav };

const MIME = 'image/jpeg';

type Phase = 'permission' | 'preview' | 'verifying' | 'done';

export const PatientKycFaceCaptureScreen: React.FC<Props> = ({ navigation }) => {
  const qc = useQueryClient();
  const [phase, setPhase] = useState<Phase>('permission');
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [matched, setMatched] = useState<boolean | null>(null);

  const { data: status } = useQuery<SelfServeStatus>({
    queryKey: ['patient-kyc-status'],
    queryFn: verificationService.getMyVerificationStatus,
    staleTime: 30_000,
  });

  const isMinor = status?.isMinor ?? false;

  /**
   * Explicit permission flow: prompt the user with the rationale, then call
   * the platform permission dialog. Handles `granted`, `limited` (treated as
   * granted — iOS limited photo access still allows taking new photos), and
   * `denied` (with an "Open Settings" fallback).
   */
  const requestAndOpenCamera = async () => {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (perm.status === 'denied') {
      Alert.alert(
        'Camera access denied',
        'We need camera access to verify your identity. Please enable it in Settings.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Open Settings', onPress: () => Linking.openSettings() },
        ],
      );
      return;
    }
    // 'granted' or 'limited' — proceed
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      cameraType: ImagePicker.CameraType.front,
      allowsEditing: false,
      quality: 0.7,
    });
    if (!result.canceled && result.assets[0]?.uri) {
      setImageUri(result.assets[0].uri);
      setPhase('preview');
      setMatched(null);
    }
  };

  const verifyMutation = useMutation({
    mutationFn: async () => {
      if (!imageUri) throw new Error('No selfie captured');
      // Prefer the new multipart endpoint (backed by the apps/kyc-ml
      // DeepFace pipeline) when available. Fall back to the legacy
      // signed-URL mock flow if the new endpoint returns 400 (which the
      // API does when KYC_ML_ENABLED=false).
      try {
        const r = await verificationService.selfFaceMatch(imageUri, MIME);
        return {
          faceMatchPassed: r.matched,
          faceMatchScore: r.similarity,
          uploadUrl: '',
          storagePath: '',
        };
      } catch (err: unknown) {
        const e = err as {
          response?: { status?: number; data?: { code?: string } };
        };
        const code = e?.response?.data?.code;
        if (code === 'LOW_CONFIDENCE' || code === 'NO_FACE_SELFIE') {
          // Bubble up — these are genuine match failures, not a missing
          // sidecar. The onError handler shows a friendly message.
          throw err;
        }
        if (e?.response?.status === 400) {
          // Sidecar disabled in this environment — use the legacy mock.
          const res = await verificationService.selfSubmitFace({
            mimeType: MIME,
            qualityHint: 'good',
          });
          await verificationService.uploadToSignedUrl(
            res.uploadUrl,
            imageUri,
            MIME,
          );
          return res;
        }
        throw err;
      }
    },
    onSuccess: (res) => {
      setMatched(res.faceMatchPassed);
      setPhase('done');
      qc.invalidateQueries({ queryKey: ['patient-kyc-status'] });
    },
    onError: (err: any) => {
      const code = err?.response?.data?.code;
      const friendly =
        code === 'NO_FACE_SELFIE'
          ? 'We could not detect a face in your selfie. Please try again with good lighting and your face centred.'
          : code === 'LOW_CONFIDENCE'
            ? 'Your selfie did not match the photo on your Aadhaar. Please retake it looking straight at the camera.'
            : err?.response?.data?.message ||
              'Please retake your selfie and try again.';
      Alert.alert('Verification failed', friendly);
      setPhase('preview');
    },
  });

  const submitForVerification = () => {
    setPhase('verifying');
    verifyMutation.mutate();
  };

  const next: 'PatientKycGuardian' | 'PatientKycReview' = isMinor
    ? 'PatientKycGuardian'
    : 'PatientKycReview';

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.step}>Step 4 of 5</Text>
      <Text style={styles.title}>Face Verification</Text>
      <Text style={styles.subtitle}>
        We&apos;ll match your live selfie against the photo on your Aadhaar.
        Your photo is processed securely and never shared.
      </Text>

      {phase === 'permission' && (
        <Card style={styles.card}>
          <Text style={styles.icon}>📸</Text>
          <Text style={styles.cardTitle}>Camera access</Text>
          <Text style={styles.cardText}>
            We need to use your camera to capture a live selfie. You&apos;ll be
            prompted to allow access. You can choose:
            {'\n'}• Allow access (recommended)
            {'\n'}• Limited access
            {'\n'}• Deny
          </Text>
          <Button title="Continue & open camera" onPress={requestAndOpenCamera} />
        </Card>
      )}

      {(phase === 'preview' || phase === 'verifying' || phase === 'done') && imageUri && (
        <Card style={styles.card}>
          <Image source={{ uri: imageUri }} style={styles.preview} resizeMode="cover" />
          {phase === 'preview' && (
            <View style={styles.row}>
              <Button
                title="Retake"
                variant="outline"
                onPress={requestAndOpenCamera}
                style={{ flex: 1 }}
              />
              <Button
                title="OK, use this"
                onPress={submitForVerification}
                style={{ flex: 1 }}
              />
            </View>
          )}
          {phase === 'verifying' && (
            <Text style={styles.verifyingText}>Verifying… please wait</Text>
          )}
          {phase === 'done' && (
            <View
              style={[
                styles.resultBlock,
                { backgroundColor: matched ? '#F0FDF4' : '#FEF2F2' },
              ]}
            >
              <Text style={styles.resultTitle}>
                {matched ? '✅ Face matched with Aadhaar' : '⚠️ Match failed'}
              </Text>
              <Text style={styles.resultText}>
                {matched
                  ? 'Your live face matched the photo on your Aadhaar.'
                  : 'We could not confirm a match. Please retake your selfie.'}
              </Text>
            </View>
          )}
        </Card>
      )}

      {phase === 'done' && matched && (
        <View style={styles.footer}>
          <Button
            title={isMinor ? 'Continue to guardian details' : 'Continue to review'}
            onPress={() => navigation.navigate(next)}
          />
        </View>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { padding: 20, paddingBottom: 40 },
  step: { fontSize: 12, color: Colors.textMuted, fontWeight: '700', marginBottom: 4 },
  title: { fontSize: 24, fontWeight: '800', color: Colors.text, marginBottom: 6 },
  subtitle: { fontSize: 14, color: Colors.textMuted, marginBottom: 20, lineHeight: 20 },
  card: { padding: 16, marginBottom: 16, gap: 12 },
  icon: { fontSize: 56, textAlign: 'center' },
  cardTitle: { fontSize: 18, fontWeight: '700', color: Colors.text, textAlign: 'center' },
  cardText: { fontSize: 13, color: Colors.textMuted, lineHeight: 20 },
  preview: {
    width: '100%',
    height: 280,
    borderRadius: 12,
    backgroundColor: '#F3F4F6',
  },
  row: { flexDirection: 'row', gap: 10 },
  verifyingText: { fontSize: 14, color: Colors.textMuted, textAlign: 'center' },
  resultBlock: { padding: 12, borderRadius: 10 },
  resultTitle: { fontSize: 15, fontWeight: '700', color: Colors.text, marginBottom: 4 },
  resultText: { fontSize: 13, color: Colors.text, lineHeight: 18 },
  footer: { marginTop: 8 },
});
