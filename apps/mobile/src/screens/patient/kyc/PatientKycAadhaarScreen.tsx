import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import * as DocumentPicker from 'expo-document-picker';
import { Colors } from '../../../constants/colors';
import { Input } from '../../../components/common/Input';
import { Button } from '../../../components/common/Button';
import { verificationService } from '../../../services/verificationService';
import { usePatientKycDraft } from '../../../state/patientKycDraft';
import { PatientStackParamList } from '../../../navigation/PatientNavigator';

type Nav = NativeStackNavigationProp<
  PatientStackParamList,
  'PatientKycAadhaarUpload'
>;
type Props = { navigation: Nav };

interface PickedFile {
  uri: string;
  name: string;
  mimeType: string;
}

/**
 * Step 1 of the patient KYC wizard — Upload eAadhaar.
 *
 * The patient selects their eAadhaar PDF (downloaded from myAadhaar.uidai.gov.in).
 * The PDF is sent to the API which calls Surepass for validation and extracts
 * personal details. The extracted fields are shown for review and can be edited
 * before the patient continues to the Personal Details and Address screens.
 *
 * No raw Aadhaar number is ever displayed — only the masked last 4 digits.
 */
export const PatientKycAadhaarScreen: React.FC<Props> = ({ navigation }) => {
  const qc = useQueryClient();
  const setOcr = usePatientKycDraft((s) => s.setOcr);

  const [picked, setPicked] = useState<PickedFile | null>(null);
  const [password, setPassword] = useState('');

  // Editable extracted fields — populated after successful validation
  const [extractedName, setExtractedName] = useState('');
  const [extractedDob, setExtractedDob] = useState('');
  const [extractedAddress, setExtractedAddress] = useState('');
  const [extractedCity, setExtractedCity] = useState('');
  const [extractedState, setExtractedState] = useState('');
  const [extractedPincode, setExtractedPincode] = useState('');
  const [aadhaarLast4, setAadhaarLast4] = useState<string | null>(null);
  const [showExtracted, setShowExtracted] = useState(false);

  const pickPdf = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: 'application/pdf',
        copyToCacheDirectory: true,
      });
      if (!result.canceled && result.assets[0]) {
        const asset = result.assets[0];
        setPicked({
          uri: asset.uri,
          name: asset.name ?? 'eaadhaar.pdf',
          mimeType: asset.mimeType ?? 'application/pdf',
        });
        setShowExtracted(false);
      }
    } catch {
      Alert.alert('Could not open file picker', 'Please try again.');
    }
  };

  const mutation = useMutation({
    mutationFn: async () => {
      if (!picked) throw new Error('no_file');
      return verificationService.selfProcessEaadhaar(
        picked.uri,
        picked.mimeType,
        password.trim() || undefined,
      );
    },
    onSuccess: (data) => {
      // Pre-fill editable fields with validated data
      setExtractedName(data.fullName ?? '');
      setExtractedDob(data.dob ?? '');
      setExtractedAddress(data.address ?? '');
      setExtractedCity(data.city ?? '');
      setExtractedState(data.state ?? '');
      setExtractedPincode(data.pincode ?? '');
      setAadhaarLast4(data.aadhaarLast4);
      setShowExtracted(true);

      // Hydrate the KYC draft so Personal Details + Address screens auto-fill
      setOcr({
        fullName: data.fullName,
        dob: data.dob,
        gender: (data.gender as 'MALE' | 'FEMALE' | 'OTHER' | null) ?? null,
        address: data.address,
        city: data.city,
        state: data.state,
        pincode: data.pincode,
        aadhaarLast4: data.aadhaarLast4,
      });
      qc.invalidateQueries({ queryKey: ['patient-kyc-status'] });
    },
    onError: (err: unknown) => {
      const e = err as {
        response?: { data?: { message?: string } };
        message?: string;
      };
      const msg =
        e?.response?.data?.message ??
        e?.message ??
        'Please try again with a valid eAadhaar PDF.';
      Alert.alert('Could not validate eAadhaar', msg);
    },
  });

  const continueToNext = () => {
    // Update the draft with any edits the patient made to the extracted fields
    setOcr({
      fullName: extractedName.trim() || null,
      dob: extractedDob.trim() || null,
      gender: null,
      address: extractedAddress.trim() || null,
      city: extractedCity.trim() || null,
      state: extractedState.trim() || null,
      pincode: extractedPincode.trim() || null,
      aadhaarLast4,
    });
    navigation.navigate('PatientKycPersonal');
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.step}>Step 1 of 5</Text>
      <Text style={styles.title}>Upload eAadhaar</Text>
      <Text style={styles.subtitle}>
        Select your eAadhaar PDF (downloaded from myAadhaar.uidai.gov.in). We
        verify it with UIDAI via Surepass and pre-fill your details. Only the
        last 4 digits of your Aadhaar number are stored.
      </Text>

      {/* PDF picker */}
      <TouchableOpacity style={styles.pickBtn} onPress={pickPdf}>
        <Text style={styles.pickIcon}>📄</Text>
        <Text style={styles.pickLabel}>
          {picked ? picked.name : 'Select eAadhaar PDF'}
        </Text>
        {picked && <Text style={styles.changeLabel}>Change</Text>}
      </TouchableOpacity>

      {/* Optional PDF password */}
      <Input
        label="PDF Password (if any)"
        placeholder="e.g. your 8-digit pincode or date-of-birth"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        autoCapitalize="none"
      />

      {/* Processing indicator */}
      {mutation.isPending && (
        <View style={styles.processing}>
          <ActivityIndicator color={Colors.primary} />
          <Text style={styles.processingText}>
            Validating your eAadhaar with UIDAI… this may take 10–20 seconds.
          </Text>
        </View>
      )}

      {/* Extracted info with editable fields */}
      {showExtracted && (
        <View style={styles.extractedCard}>
          <Text style={styles.extractedTitle}>✅ eAadhaar Validated</Text>
          <Text style={styles.extractedHint}>
            Details extracted from your eAadhaar are shown below. You can edit
            them if there is any mismatch.
          </Text>

          {aadhaarLast4 && (
            <View style={styles.aadhaarRow}>
              <Text style={styles.aadhaarLabel}>Aadhaar</Text>
              <Text style={styles.aadhaarValue}>
                XXXX XXXX {aadhaarLast4}
              </Text>
            </View>
          )}

          <Input
            label="Full Name"
            value={extractedName}
            onChangeText={setExtractedName}
            autoCapitalize="words"
          />
          <Input
            label="Date of Birth (YYYY-MM-DD)"
            value={extractedDob}
            onChangeText={setExtractedDob}
            keyboardType="numbers-and-punctuation"
            placeholder="e.g. 1990-01-01"
          />
          <Input
            label="Address"
            value={extractedAddress}
            onChangeText={setExtractedAddress}
            multiline
          />
          <Input
            label="City / District"
            value={extractedCity}
            onChangeText={setExtractedCity}
          />
          <Input
            label="State"
            value={extractedState}
            onChangeText={setExtractedState}
          />
          <Input
            label="Pincode"
            value={extractedPincode}
            onChangeText={setExtractedPincode}
            keyboardType="number-pad"
            maxLength={10}
          />
        </View>
      )}

      <View style={styles.footer}>
        {!showExtracted ? (
          <Button
            title={mutation.isPending ? 'Validating…' : 'Validate eAadhaar'}
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
  step: {
    fontSize: 12,
    color: Colors.textMuted,
    fontWeight: '700',
    marginBottom: 4,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: Colors.text,
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 14,
    color: Colors.textMuted,
    marginBottom: 24,
    lineHeight: 20,
  },
  pickBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 14,
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderRadius: 12,
    backgroundColor: Colors.white,
    marginBottom: 16,
    gap: 10,
  },
  pickIcon: { fontSize: 24 },
  pickLabel: { flex: 1, fontSize: 14, fontWeight: '600', color: Colors.text },
  changeLabel: { fontSize: 12, color: Colors.primary, fontWeight: '700' },
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
    fontSize: 15,
    fontWeight: '700',
    color: Colors.primary,
    marginBottom: 4,
  },
  extractedHint: {
    fontSize: 12,
    color: Colors.textMuted,
    marginBottom: 14,
    lineHeight: 17,
  },
  aadhaarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
    paddingVertical: 8,
    paddingHorizontal: 10,
    backgroundColor: Colors.white,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  aadhaarLabel: { fontSize: 13, color: Colors.textMuted },
  aadhaarValue: { fontSize: 14, fontWeight: '700', color: Colors.text },
  footer: { marginTop: 16 },
});

