import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import * as ImagePicker from 'expo-image-picker';
import { Colors } from '../../../constants/colors';
import { Button } from '../../../components/common/Button';
import { verificationService } from '../../../services/verificationService';
import { usePatientKycDraft } from '../../../state/patientKycDraft';
import { PatientStackParamList } from '../../../navigation/PatientNavigator';

type Nav = NativeStackNavigationProp<
  PatientStackParamList,
  'PatientKycAadhaarUpload'
>;
type Props = { navigation: Nav };

interface PickedImage {
  uri: string;
  mimeType: string;
}

/**
 * Step 1 of the patient KYC wizard.
 *
 * The patient takes a photo of (or picks from gallery) their Aadhaar card.
 * We send it to the API which proxies to the apps/kyc-ml microservice for
 * OCR + face crop. The extracted fields land in `usePatientKycDraft` so
 * the next two screens (Personal Details, Address) can pre-fill from them.
 *
 * No raw Aadhaar number is ever displayed — only the masked last-4 digits.
 */
export const PatientKycAadhaarScreen: React.FC<Props> = ({ navigation }) => {
  const qc = useQueryClient();
  const setOcr = usePatientKycDraft((s) => s.setOcr);

  const [picked, setPicked] = useState<PickedImage | null>(null);
  const [extracted, setExtracted] = useState<{
    fullName: string | null;
    dob: string | null;
    aadhaarLast4: string | null;
  } | null>(null);

  const pickFromCamera = async () => {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (perm.status !== 'granted') {
      Alert.alert(
        'Camera permission required',
        'Please allow camera access to capture your Aadhaar card.',
      );
      return;
    }
    const res = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.85,
      allowsEditing: false,
    });
    if (!res.canceled && res.assets[0]) {
      setPicked({
        uri: res.assets[0].uri,
        mimeType: res.assets[0].mimeType ?? 'image/jpeg',
      });
      setExtracted(null);
    }
  };

  const pickFromGallery = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (perm.status !== 'granted') {
      Alert.alert(
        'Gallery permission required',
        'Please allow photo access to select your Aadhaar image.',
      );
      return;
    }
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.85,
      allowsEditing: false,
    });
    if (!res.canceled && res.assets[0]) {
      setPicked({
        uri: res.assets[0].uri,
        mimeType: res.assets[0].mimeType ?? 'image/jpeg',
      });
      setExtracted(null);
    }
  };

  const mutation = useMutation({
    mutationFn: async () => {
      if (!picked) throw new Error('no_image');
      return verificationService.selfProcessAadhaar(picked.uri, picked.mimeType);
    },
    onSuccess: (data) => {
      setOcr({
        fullName: data.fullName,
        dob: data.dob,
        gender: (data.gender as 'MALE' | 'FEMALE' | 'OTHER' | null) ?? null,
        address: data.address,
        aadhaarLast4: data.aadhaarLast4,
      });
      setExtracted({
        fullName: data.fullName,
        dob: data.dob,
        aadhaarLast4: data.aadhaarLast4,
      });
      qc.invalidateQueries({ queryKey: ['patient-kyc-status'] });
    },
    onError: (err: unknown) => {
      // The API forwards structured codes from the kyc-ml sidecar; show a
      // friendly message for the most common ones.
      const e = err as {
        response?: { data?: { code?: string; message?: string } };
      };
      const code = e?.response?.data?.code;
      const fallback = e?.response?.data?.message ?? 'Please try again.';
      const friendly =
        code === 'NO_FACE_AADHAAR'
          ? 'We could not find your photo on the card. Please retake the picture in good lighting.'
          : code === 'INVALID_IMAGE'
            ? 'That file is not a valid image. Please try again.'
            : code === 'OCR_FAILED'
              ? 'We could not read the card text. Please try again with a clearer photo.'
              : fallback;
      Alert.alert('Could not process Aadhaar', friendly);
    },
  });

  const continueToNext = () => {
    navigation.navigate('PatientKycPersonal');
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.step}>Step 1 of 5</Text>
      <Text style={styles.title}>Upload Your Aadhaar</Text>
      <Text style={styles.subtitle}>
        Take a clear photo of the front of your Aadhaar card. We use it to
        pre-fill your details and verify your identity. Only the last 4 digits
        of your Aadhaar number are stored.
      </Text>

      <View style={styles.row}>
        <TouchableOpacity style={styles.pickBtn} onPress={pickFromCamera}>
          <Text style={styles.pickIcon}>📷</Text>
          <Text style={styles.pickLabel}>Use camera</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.pickBtn} onPress={pickFromGallery}>
          <Text style={styles.pickIcon}>🖼️</Text>
          <Text style={styles.pickLabel}>Pick from gallery</Text>
        </TouchableOpacity>
      </View>

      {picked && (
        <View style={styles.preview}>
          <Image source={{ uri: picked.uri }} style={styles.previewImg} />
        </View>
      )}

      {mutation.isPending && (
        <View style={styles.processing}>
          <ActivityIndicator color={Colors.primary} />
          <Text style={styles.processingText}>
            Reading your Aadhaar card… this can take 10–20 seconds.
          </Text>
        </View>
      )}

      {extracted && (
        <View style={styles.extractedCard}>
          <Text style={styles.extractedTitle}>Extracted from card</Text>
          {extracted.fullName ? (
            <Text style={styles.extractedRow}>
              Name: <Text style={styles.bold}>{extracted.fullName}</Text>
            </Text>
          ) : null}
          {extracted.dob ? (
            <Text style={styles.extractedRow}>
              DOB: <Text style={styles.bold}>{extracted.dob}</Text>
            </Text>
          ) : null}
          {extracted.aadhaarLast4 ? (
            <Text style={styles.extractedRow}>
              Aadhaar:{' '}
              <Text style={styles.bold}>
                XXXX XXXX {extracted.aadhaarLast4}
              </Text>
            </Text>
          ) : null}
          <Text style={styles.extractedHint}>
            You can still edit any of these on the next screens.
          </Text>
        </View>
      )}

      <View style={styles.footer}>
        {!extracted ? (
          <Button
            title={mutation.isPending ? 'Reading…' : 'Process Aadhaar'}
            onPress={() => mutation.mutate()}
            disabled={!picked || mutation.isPending}
            loading={mutation.isPending}
          />
        ) : (
          <Button title="Continue" onPress={continueToNext} />
        )}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { padding: 20, paddingBottom: 40 },
  step: { fontSize: 12, color: Colors.textMuted, fontWeight: '700', marginBottom: 4 },
  title: { fontSize: 24, fontWeight: '800', color: Colors.text, marginBottom: 6 },
  subtitle: { fontSize: 14, color: Colors.textMuted, marginBottom: 24, lineHeight: 20 },
  row: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  pickBtn: {
    flex: 1,
    paddingVertical: 18,
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderRadius: 12,
    alignItems: 'center',
    backgroundColor: Colors.white,
  },
  pickIcon: { fontSize: 28, marginBottom: 4 },
  pickLabel: { fontSize: 13, fontWeight: '600', color: Colors.text },
  preview: {
    marginTop: 8,
    marginBottom: 12,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  previewImg: { width: '100%', height: 220, resizeMode: 'cover' },
  processing: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginVertical: 14,
  },
  processingText: { flex: 1, color: Colors.textMuted, fontSize: 13 },
  extractedCard: {
    marginVertical: 16,
    padding: 14,
    backgroundColor: Colors.primaryLight,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.primary,
  },
  extractedTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.primary,
    marginBottom: 8,
  },
  extractedRow: { fontSize: 14, color: Colors.text, marginBottom: 4 },
  bold: { fontWeight: '700' },
  extractedHint: { fontSize: 12, color: Colors.textMuted, marginTop: 6 },
  footer: { marginTop: 16 },
});
