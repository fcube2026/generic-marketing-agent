import React, { useState } from 'react';
import { Text, StyleSheet, ScrollView, View, Alert } from 'react-native';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Colors } from '../../../constants/colors';
import { Input } from '../../../components/common/Input';
import { Button } from '../../../components/common/Button';
import { verificationService } from '../../../services/verificationService';
import { PatientStackParamList } from '../../../navigation/PatientNavigator';

type Nav = NativeStackNavigationProp<PatientStackParamList, 'PatientKycGuardian'>;
type Props = { navigation: Nav };

export const PatientKycGuardianScreen: React.FC<Props> = ({ navigation }) => {
  const qc = useQueryClient();
  const [guardianName, setGuardianName] = useState('');
  const [relationship, setRelationship] = useState('');
  const [phone, setPhone] = useState('');
  const [aadhaarLast4, setAadhaarLast4] = useState('');

  const mutation = useMutation({
    mutationFn: () =>
      verificationService.selfSubmitGuardian({
        guardianName: guardianName.trim(),
        relationship: relationship.trim(),
        guardianPhone: phone.trim(),
        guardianAadhaarLast4: aadhaarLast4.trim(),
      }),
    onSuccess: (data) => {
      qc.setQueryData(['patient-kyc-status'], data);
      qc.invalidateQueries({ queryKey: ['patient-kyc-status'] });
      navigation.navigate('PatientKycReview');
    },
    onError: (err: any) => {
      Alert.alert(
        'Could not save guardian details',
        err?.response?.data?.message || 'Please check your inputs and try again.',
      );
    },
  });

  const isValid =
    guardianName.trim().length >= 2 &&
    relationship.trim().length >= 2 &&
    /^\+?\d{10,15}$/.test(phone.trim()) &&
    /^\d{4}$/.test(aadhaarLast4.trim());

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.step}>Step 5 of 5 (Minor)</Text>
      <Text style={styles.title}>Guardian Details</Text>
      <Text style={styles.subtitle}>
        Since you are under 18, please provide your parent or guardian&apos;s
        details. No live selfie is required for the guardian — only their
        contact and last 4 digits of their Aadhaar.
      </Text>

      <Input label="Guardian's full name" value={guardianName} onChangeText={setGuardianName} />
      <Input
        label="Relationship"
        placeholder="e.g. Father, Mother"
        value={relationship}
        onChangeText={setRelationship}
      />
      <Input
        label="Guardian's mobile number"
        value={phone}
        onChangeText={setPhone}
        keyboardType="phone-pad"
        maxLength={15}
      />
      <Input
        label="Last 4 digits of guardian's Aadhaar"
        value={aadhaarLast4}
        onChangeText={(v) => setAadhaarLast4(v.replace(/\D/g, '').slice(0, 4))}
        keyboardType="number-pad"
        maxLength={4}
      />

      <View style={styles.footer}>
        <Button
          title="Continue to review"
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
  subtitle: { fontSize: 14, color: Colors.textMuted, marginBottom: 20, lineHeight: 20 },
  footer: { marginTop: 16 },
});
