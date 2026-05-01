import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
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

/**
 * Step 1 of the patient KYC wizard — Aadhaar number validation.
 *
 * The patient enters their 12-digit Aadhaar number. The API calls Surepass
 * which validates it with UIDAI and returns the age range, state, gender and
 * whether a mobile number is registered. These details auto-fill subsequent
 * wizard screens. No raw Aadhaar number is stored — only the last 4 digits.
 */
export const PatientKycAadhaarScreen: React.FC<Props> = ({ navigation }) => {
  const qc = useQueryClient();
  const setOcr = usePatientKycDraft((s) => s.setOcr);

  const [aadhaarNumber, setAadhaarNumber] = useState('');
  const [showResult, setShowResult] = useState(false);

  // Fields populated after successful validation
  const [aadhaarLast4, setAadhaarLast4] = useState<string | null>(null);
  const [validatedGender, setValidatedGender] = useState<string | null>(null);
  const [validatedState, setValidatedState] = useState<string | null>(null);
  const [ageRange, setAgeRange] = useState<string | null>(null);
  const [isMobile, setIsMobile] = useState<boolean | null>(null);

  const isValidNumber = /^\d{12}$/.test(aadhaarNumber.replace(/\s/g, ''));

  const mutation = useMutation({
    mutationFn: async () => {
      const cleaned = aadhaarNumber.replace(/\s/g, '');
      return verificationService.selfValidateAadhaarNumber(cleaned);
    },
    onSuccess: (data) => {
      setAadhaarLast4(data.aadhaarLast4);
      setValidatedGender(data.gender);
      setValidatedState(data.state);
      setAgeRange(data.ageRange);
      setIsMobile(data.isMobile);
      setShowResult(true);

      // Hydrate the KYC draft so Personal Details + Address screens auto-fill
      setOcr({
        fullName: null,
        dob: null,
        gender: (data.gender as 'MALE' | 'FEMALE' | 'OTHER' | null) ?? null,
        address: null,
        city: null,
        state: data.state,
        pincode: null,
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
        'Please check your Aadhaar number and try again.';
      Alert.alert('Could not validate Aadhaar', msg);
    },
  });

  const continueToNext = () => {
    navigation.navigate('PatientKycPersonal');
  };

  const genderLabel = (g: string | null) => {
    if (!g) return '—';
    if (g === 'MALE') return 'Male';
    if (g === 'FEMALE') return 'Female';
    return g;
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.step}>Step 1 of 5</Text>
      <Text style={styles.title}>Aadhaar Verification</Text>
      <Text style={styles.subtitle}>
        Enter your 12-digit Aadhaar number. We verify it with UIDAI via
        Surepass and pre-fill your details. Only the last 4 digits are stored.
      </Text>

      <Input
        label="Aadhaar Number"
        placeholder="Enter 12-digit Aadhaar number"
        value={aadhaarNumber}
        onChangeText={(t) => {
          setAadhaarNumber(t);
          setShowResult(false);
        }}
        keyboardType="number-pad"
        maxLength={12}
        autoCapitalize="none"
      />

      {/* Processing indicator */}
      {mutation.isPending && (
        <View style={styles.processing}>
          <ActivityIndicator color={Colors.primary} />
          <Text style={styles.processingText}>
            Validating with UIDAI… this may take a few seconds.
          </Text>
        </View>
      )}

      {/* Validation result */}
      {showResult && (
        <View style={styles.resultCard}>
          <Text style={styles.resultTitle}>✅ Aadhaar Validated</Text>
          <Text style={styles.resultHint}>
            The following details were retrieved from UIDAI records and will
            be used to pre-fill your profile.
          </Text>

          {aadhaarLast4 && (
            <View style={styles.row}>
              <Text style={styles.rowLabel}>Aadhaar</Text>
              <Text style={styles.rowValue}>
                XXXX XXXX XXXX {aadhaarLast4}
              </Text>
            </View>
          )}
          {validatedGender && (
            <View style={styles.row}>
              <Text style={styles.rowLabel}>Gender</Text>
              <Text style={styles.rowValue}>{genderLabel(validatedGender)}</Text>
            </View>
          )}
          {validatedState && (
            <View style={styles.row}>
              <Text style={styles.rowLabel}>State</Text>
              <Text style={styles.rowValue}>{validatedState}</Text>
            </View>
          )}
          {ageRange && (
            <View style={styles.row}>
              <Text style={styles.rowLabel}>Age Range</Text>
              <Text style={styles.rowValue}>{ageRange} years</Text>
            </View>
          )}
          {isMobile !== null && (
            <View style={styles.row}>
              <Text style={styles.rowLabel}>Mobile Linked</Text>
              <Text style={styles.rowValue}>{isMobile ? 'Yes' : 'No'}</Text>
            </View>
          )}
        </View>
      )}

      <View style={styles.footer}>
        {!showResult ? (
          <Button
            title={mutation.isPending ? 'Validating…' : 'Validate Aadhaar'}
            onPress={() => mutation.mutate()}
            disabled={!isValidNumber || mutation.isPending}
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
  processing: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginVertical: 14,
  },
  processingText: { flex: 1, color: Colors.textMuted, fontSize: 13 },
  resultCard: {
    marginVertical: 16,
    padding: 14,
    backgroundColor: Colors.primaryLight,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.primary,
  },
  resultTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.primary,
    marginBottom: 4,
  },
  resultHint: {
    fontSize: 12,
    color: Colors.textMuted,
    marginBottom: 14,
    lineHeight: 17,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
    paddingHorizontal: 10,
    backgroundColor: Colors.white,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: 8,
  },
  rowLabel: { fontSize: 13, color: Colors.textMuted },
  rowValue: { fontSize: 14, fontWeight: '700', color: Colors.text },
  footer: { marginTop: 16 },
});

