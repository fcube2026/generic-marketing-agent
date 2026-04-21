import React from 'react';
import {
  Text,
  StyleSheet,
  ScrollView,
  View,
  ActivityIndicator,
  Alert,
} from 'react-native';
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

type Nav = NativeStackNavigationProp<PatientStackParamList, 'PatientKycReview'>;
type Props = { navigation: Nav };

const formatDob = (iso: string | null) => {
  if (!iso) return '—';
  return iso.slice(0, 10);
};

const Row: React.FC<{ label: string; value: string | null | undefined }> = ({
  label,
  value,
}) => (
  <View style={styles.row}>
    <Text style={styles.label}>{label}</Text>
    <Text style={styles.value}>{value || '—'}</Text>
  </View>
);

export const PatientKycReviewScreen: React.FC<Props> = ({ navigation }) => {
  const qc = useQueryClient();
  const { data: status, isLoading } = useQuery<SelfServeStatus>({
    queryKey: ['patient-kyc-status'],
    queryFn: verificationService.getMyVerificationStatus,
  });

  const submit = useMutation({
    mutationFn: () => verificationService.selfSubmitForApproval(),
    onSuccess: (data) => {
      qc.setQueryData(['patient-kyc-status'], data);
      qc.invalidateQueries({ queryKey: ['patient-kyc-status'] });
      Alert.alert(
        'Verification complete',
        'Your identity has been verified. You can now book consultations.',
        [{ text: 'OK', onPress: () => navigation.navigate('PatientKyc') }],
      );
    },
    onError: (err: any) => {
      Alert.alert(
        'Submission failed',
        err?.response?.data?.message ||
          'Please make sure all previous steps are complete and try again.',
      );
    },
  });

  if (isLoading || !status) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={Colors.primary} size="large" />
      </View>
    );
  }

  const ocrOk = status.idDocument?.ocrMatchPassed === true;
  const faceOk = status.faceCapture?.faceMatchPassed === true;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Review & Submit</Text>
      <Text style={styles.subtitle}>
        Please review the information you&apos;ve provided. Submit for verification when ready.
      </Text>

      <Card style={styles.card}>
        <Text style={styles.section}>Personal Details</Text>
        <Row label="Full name" value={status.personalDetails?.fullName} />
        <Row label="Date of birth" value={formatDob(status.personalDetails?.dateOfBirth ?? null)} />
        <Row label="Gender" value={status.personalDetails?.gender} />
        {status.isMinor && (
          <Text style={styles.minorBadge}>Minor (under 18) — guardian required</Text>
        )}
      </Card>

      <Card style={styles.card}>
        <Text style={styles.section}>Address</Text>
        <Row label="Source" value={status.address?.source} />
        {status.address?.addressLine && (
          <Row label="Address" value={status.address.addressLine} />
        )}
        {status.address?.city && <Row label="City" value={status.address.city} />}
        {status.address?.state && <Row label="State" value={status.address.state} />}
        {status.address?.pincode && <Row label="Pincode" value={status.address.pincode} />}
        {status.address?.lat != null && status.address?.lng != null && (
          <Row
            label="Coordinates"
            value={`${status.address.lat.toFixed(5)}, ${status.address.lng.toFixed(5)}`}
          />
        )}
      </Card>

      <Card style={styles.card}>
        <Text style={styles.section}>Identity Document</Text>
        <Row label="Document type" value={status.idDocument?.documentType} />
        <Row label="Extracted name" value={status.idDocument?.extractedName} />
        <Row label="ID number" value={status.idDocument?.extractedIdNumber} />
        <View style={[styles.badge, ocrOk ? styles.badgeOk : styles.badgeFail]}>
          <Text style={styles.badgeText}>
            {ocrOk ? '✓ OCR matched Aadhaar' : '✗ OCR did not match'}
          </Text>
        </View>
      </Card>

      <Card style={styles.card}>
        <Text style={styles.section}>Face Verification</Text>
        <Row
          label="Selfie captured"
          value={status.faceCapture?.captured ? 'Yes' : 'No'}
        />
        <View style={[styles.badge, faceOk ? styles.badgeOk : styles.badgeFail]}>
          <Text style={styles.badgeText}>
            {faceOk
              ? '✓ Live face matched Aadhaar photo'
              : '✗ Face match not confirmed'}
          </Text>
        </View>
      </Card>

      {status.isMinor && (
        <Card style={styles.card}>
          <Text style={styles.section}>Guardian</Text>
          <Row label="Name" value={status.guardian?.guardianName} />
          <Row label="Relationship" value={status.guardian?.relationship} />
          <Row label="Phone" value={status.guardian?.guardianPhone} />
          <Row
            label="Aadhaar (last 4)"
            value={
              status.guardian?.guardianAadhaarLast4
                ? `XXXX XXXX ${status.guardian.guardianAadhaarLast4}`
                : null
            }
          />
        </Card>
      )}

      <View style={styles.footer}>
        <Button
          title={submit.isPending ? 'Submitting…' : 'Submit for Verification'}
          onPress={() => submit.mutate()}
          loading={submit.isPending}
        />
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 20 },
  content: { padding: 20, paddingBottom: 40 },
  title: { fontSize: 24, fontWeight: '800', color: Colors.text, marginBottom: 6 },
  subtitle: { fontSize: 14, color: Colors.textMuted, marginBottom: 20, lineHeight: 20 },
  card: { padding: 14, marginBottom: 14, gap: 4 },
  section: { fontSize: 16, fontWeight: '700', color: Colors.text, marginBottom: 8 },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  label: { fontSize: 13, color: Colors.textMuted },
  value: { fontSize: 13, color: Colors.text, fontWeight: '600', flexShrink: 1, textAlign: 'right' },
  badge: {
    marginTop: 10,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  badgeOk: { backgroundColor: '#DCFCE7' },
  badgeFail: { backgroundColor: '#FEE2E2' },
  badgeText: { fontSize: 12, fontWeight: '700', color: Colors.text },
  minorBadge: {
    marginTop: 8,
    fontSize: 12,
    color: '#92400E',
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    alignSelf: 'flex-start',
    fontWeight: '700',
  },
  footer: { marginTop: 8 },
});
