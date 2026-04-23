import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
  Image,
  TouchableOpacity,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Colors } from '../../../constants/colors';
import { Button } from '../../../components/common/Button';
import { Card } from '../../../components/common/Card';
import { verificationService } from '../../../services/verificationService';
import { PatientStackParamList } from '../../../navigation/PatientNavigator';

type Nav = NativeStackNavigationProp<PatientStackParamList, 'PatientKycIdUpload'>;
type Props = { navigation: Nav };

const MIME = 'image/jpeg';

export const PatientKycIdUploadScreen: React.FC<Props> = ({ navigation }) => {
  const qc = useQueryClient();
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [extractedName, setExtractedName] = useState<string | null>(null);
  const [matched, setMatched] = useState<boolean | null>(null);

  const pickImage = async (fromCamera: boolean) => {
    const perm = fromCamera
      ? await ImagePicker.requestCameraPermissionsAsync()
      : await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (perm.status !== 'granted') {
      Alert.alert(
        fromCamera ? 'Camera permission required' : 'Photo library permission required',
        'Please enable access in your device settings to upload your Aadhaar.',
      );
      return;
    }
    const result = fromCamera
      ? await ImagePicker.launchCameraAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          allowsEditing: true,
          quality: 0.7,
        })
      : await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          allowsEditing: true,
          quality: 0.7,
        });
    if (!result.canceled && result.assets[0]?.uri) {
      setImageUri(result.assets[0].uri);
      setExtractedName(null);
      setMatched(null);
    }
  };

  const uploadMutation = useMutation({
    mutationFn: async () => {
      if (!imageUri) throw new Error('No image selected');
      const { uploadUrl, documentId } =
        await verificationService.selfGetIdUploadUrl('AADHAAR_FRONT', MIME);
      await verificationService.uploadToSignedUrl(uploadUrl, imageUri, MIME);
      const confirm = await verificationService.selfConfirmIdUpload(documentId);
      return confirm;
    },
    onSuccess: (res) => {
      setExtractedName(res.ocrResult?.extractedName ?? 'Match found');
      setMatched(res.ocrMatchPassed);
      qc.invalidateQueries({ queryKey: ['patient-kyc-status'] });
    },
    onError: (err: any) => {
      Alert.alert(
        'Upload failed',
        err?.response?.data?.message || 'Could not upload your Aadhaar. Please try again.',
      );
    },
  });

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.step}>Step 3 of 5</Text>
      <Text style={styles.title}>Upload Aadhaar</Text>
      <Text style={styles.subtitle}>
        Upload a clear photo of the front of your Aadhaar card. The number is
        masked for your privacy.
      </Text>

      <Card style={styles.uploadCard}>
        {imageUri ? (
          <Image source={{ uri: imageUri }} style={styles.preview} resizeMode="cover" />
        ) : (
          <View style={styles.placeholder}>
            <Text style={styles.placeholderIcon}>🪪</Text>
            <Text style={styles.placeholderText}>No image selected</Text>
          </View>
        )}

        <View style={styles.row}>
          <TouchableOpacity style={styles.actionBtn} onPress={() => pickImage(true)}>
            <Text style={styles.actionIcon}>📷</Text>
            <Text style={styles.actionText}>Take photo</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionBtn} onPress={() => pickImage(false)}>
            <Text style={styles.actionIcon}>🖼️</Text>
            <Text style={styles.actionText}>Choose from gallery</Text>
          </TouchableOpacity>
        </View>
      </Card>

      {imageUri && extractedName === null && (
        <Button
          title={uploadMutation.isPending ? 'Uploading…' : 'Upload & verify'}
          onPress={() => uploadMutation.mutate()}
          loading={uploadMutation.isPending}
        />
      )}

      {extractedName !== null && (
        <Card
          style={{
            ...styles.resultCard,
            backgroundColor: matched ? '#F0FDF4' : '#FEF2F2',
          }}
        >
          <Text style={styles.resultTitle}>
            {matched ? '✅ Aadhaar verified' : '⚠️ Could not verify'}
          </Text>
          <Text style={styles.resultText}>
            Extracted name: <Text style={styles.bold}>{extractedName}</Text>
          </Text>
          <Text style={styles.resultMeta}>
            We only store a masked Aadhaar number — never the full 12 digits.
          </Text>
        </Card>
      )}

      {extractedName !== null && (
        <View style={styles.footer}>
          <Button
            title="Continue to face capture"
            onPress={() => navigation.navigate('PatientKycFaceCapture')}
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
  uploadCard: { padding: 14, marginBottom: 16 },
  preview: { width: '100%', height: 200, borderRadius: 8, backgroundColor: '#F3F4F6' },
  placeholder: {
    height: 200,
    borderRadius: 8,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholderIcon: { fontSize: 56, marginBottom: 8 },
  placeholderText: { fontSize: 14, color: Colors.textMuted },
  row: { flexDirection: 'row', gap: 10, marginTop: 14 },
  actionBtn: {
    flex: 1,
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
    backgroundColor: Colors.white,
  },
  actionIcon: { fontSize: 20, marginBottom: 4 },
  actionText: { fontSize: 13, fontWeight: '600', color: Colors.text },
  resultCard: { padding: 14, marginBottom: 16 },
  resultTitle: { fontSize: 16, fontWeight: '700', color: Colors.text, marginBottom: 6 },
  resultText: { fontSize: 14, color: Colors.text, marginBottom: 4 },
  resultMeta: { fontSize: 12, color: Colors.textMuted, marginTop: 4 },
  bold: { fontWeight: '700' },
  footer: { marginTop: 8 },
});
