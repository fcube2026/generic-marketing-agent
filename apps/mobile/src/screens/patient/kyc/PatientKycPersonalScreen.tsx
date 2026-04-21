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

type Nav = NativeStackNavigationProp<PatientStackParamList, 'PatientKycPersonal'>;
type Props = { navigation: Nav };

const GENDERS: Array<{ key: 'MALE' | 'FEMALE' | 'OTHER'; label: string }> = [
  { key: 'MALE', label: 'Male' },
  { key: 'FEMALE', label: 'Female' },
  { key: 'OTHER', label: 'Other' },
];

export const PatientKycPersonalScreen: React.FC<Props> = ({ navigation }) => {
  const qc = useQueryClient();
  const [fullName, setFullName] = useState('');
  const [dob, setDob] = useState(''); // YYYY-MM-DD
  const [gender, setGender] = useState<'MALE' | 'FEMALE' | 'OTHER' | null>(null);

  const mutation = useMutation({
    mutationFn: () =>
      verificationService.selfSubmitPersonalDetails({
        fullName: fullName.trim(),
        dateOfBirth: dob,
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
    fullName.trim().length >= 2 &&
    /^\d{4}-\d{2}-\d{2}$/.test(dob) &&
    !!gender;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.step}>Step 1 of 5</Text>
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
        label="Date of Birth (YYYY-MM-DD)"
        placeholder="e.g. 1995-08-12"
        value={dob}
        onChangeText={setDob}
        keyboardType="numbers-and-punctuation"
      />

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
});
