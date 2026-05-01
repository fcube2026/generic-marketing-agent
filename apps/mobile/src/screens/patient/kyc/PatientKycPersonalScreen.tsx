import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Colors } from '../../../constants/colors';
import { Input } from '../../../components/common/Input';
import { Button } from '../../../components/common/Button';
import { verificationService } from '../../../services/verificationService';
import { PatientStackParamList } from '../../../navigation/PatientNavigator';
import { usePatientKycDraft } from '../../../state/patientKycDraft';

type Nav = NativeStackNavigationProp<PatientStackParamList, 'PatientKycPersonal'>;
type Props = { navigation: Nav };

const GENDERS: Array<{ key: 'MALE' | 'FEMALE' | 'OTHER'; label: string }> = [
  { key: 'MALE', label: 'Male' },
  { key: 'FEMALE', label: 'Female' },
  { key: 'OTHER', label: 'Other' },
];

export const PatientKycPersonalScreen: React.FC<Props> = ({ navigation }) => {
  const qc = useQueryClient();
  // Pre-fill from the Aadhaar OCR draft (if the patient just came from
  // Step 1). Every field stays editable — the draft is only a hint.
  const ocrDraft = usePatientKycDraft((s) => s.ocr);
  const [fullName, setFullName] = useState(ocrDraft?.fullName ?? '');
  const [dob, setDob] = useState(ocrDraft?.dob ?? ''); // free-form, normalised on submit
  const [gender, setGender] = useState<'MALE' | 'FEMALE' | 'OTHER' | null>(
    ocrDraft?.gender ?? null,
  );

  /**
   * Accept a few common DOB formats and normalise to ISO `YYYY-MM-DD`:
   *   - `YYYY-MM-DD`
   *   - `DD/MM/YYYY` or `DD-MM-YYYY` (Aadhaar print format)
   *   - `D/M/YYYY` (single-digit day/month)
   * Returns `null` if the value can't be parsed into a real calendar date.
   */
  const normaliseDob = (raw: string): string | null => {
    const v = raw.trim();
    if (!v) return null;
    let y: number, m: number, d: number;
    let match = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(v);
    if (match) {
      y = Number(match[1]);
      m = Number(match[2]);
      d = Number(match[3]);
    } else {
      match = /^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/.exec(v);
      if (!match) return null;
      d = Number(match[1]);
      m = Number(match[2]);
      y = Number(match[3]);
    }
    if (m < 1 || m > 12 || d < 1 || d > 31) return null;
    const dt = new Date(Date.UTC(y, m - 1, d));
    if (
      dt.getUTCFullYear() !== y ||
      dt.getUTCMonth() !== m - 1 ||
      dt.getUTCDate() !== d
    ) {
      return null;
    }
    // Reject future DOBs.
    if (dt.getTime() > Date.now()) return null;
    const mm = String(m).padStart(2, '0');
    const dd = String(d).padStart(2, '0');
    return `${y}-${mm}-${dd}`;
  };

  const normalisedDob = normaliseDob(dob);

  const mutation = useMutation({
    mutationFn: () =>
      verificationService.selfSubmitPersonalDetails({
        fullName: fullName.trim(),
        dateOfBirth: normalisedDob ?? '',
        gender: gender as 'MALE' | 'FEMALE' | 'OTHER',
      }),
    onSuccess: (data) => {
      qc.setQueryData(['patient-kyc-status'], data);
      qc.invalidateQueries({ queryKey: ['patient-kyc-status'] });
      navigation.navigate('PatientKycAddress');
    },
    onError: (err: any) => {
      Alert.alert(
        'Could not save details',
        err?.response?.data?.message || 'Please check your inputs and try again.',
      );
    },
  });

  const isValid =
    fullName.trim().length >= 2 && !!normalisedDob && !!gender;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.step}>Step 2 of 5</Text>
      <Text style={styles.title}>Your Details</Text>
      <Text style={styles.subtitle}>
        Enter your details exactly as they appear on your Aadhaar card.
      </Text>

      <Input
        label="Full Name"
        placeholder="As per Aadhaar"
        value={fullName}
        onChangeText={setFullName}
        autoCapitalize="words"
      />

      <Input
        label="Date of Birth"
        placeholder="DD/MM/YYYY (e.g. 12/08/1995)"
        value={dob}
        onChangeText={setDob}
        keyboardType="numbers-and-punctuation"
      />
      {dob.trim().length > 0 && !normalisedDob && (
        <Text style={styles.helper}>
          Please enter a valid date as DD/MM/YYYY (or YYYY-MM-DD).
        </Text>
      )}

      <Text style={styles.label}>Gender</Text>
      <View style={styles.genderRow}>
        {GENDERS.map((g) => (
          <TouchableOpacity
            key={g.key}
            style={[styles.pill, gender === g.key && styles.pillActive]}
            onPress={() => setGender(g.key)}
          >
            <Text
              style={[
                styles.pillText,
                gender === g.key && styles.pillTextActive,
              ]}
            >
              {g.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.footer}>
        <Button
          title={mutation.isPending ? 'Saving…' : 'Continue'}
          onPress={() => mutation.mutate()}
          disabled={!isValid}
          loading={mutation.isPending}
        />
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
  label: { fontSize: 14, fontWeight: '500', color: Colors.text, marginBottom: 8 },
  genderRow: { flexDirection: 'row', gap: 10, marginBottom: 24 },
  pill: {
    flex: 1,
    paddingVertical: 12,
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderRadius: 10,
    alignItems: 'center',
    backgroundColor: Colors.white,
  },
  pillActive: { borderColor: Colors.primary, backgroundColor: Colors.primaryLight },
  pillText: { fontSize: 14, fontWeight: '600', color: Colors.textMuted },
  pillTextActive: { color: Colors.primary },
  footer: { marginTop: 16 },
  helper: { fontSize: 12, color: Colors.error, marginTop: -8, marginBottom: 12 },
});
