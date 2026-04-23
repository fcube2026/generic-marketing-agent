import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import { Colors } from '../../constants/colors';
import { Button } from '../../components/common/Button';
import { Card } from '../../components/common/Card';
import { verificationService } from '../../services/verificationService';
import { PatientStackParamList } from '../../navigation/PatientNavigator';

type Props = {
  navigation: NativeStackNavigationProp<PatientStackParamList, 'VerificationStatus'>;
  route: RouteProp<PatientStackParamList, 'VerificationStatus'>;
};

const TIER_COLORS: Record<string, string> = {
  LOW: Colors.success,
  MEDIUM: Colors.warning,
  HIGH: '#F97316',
  CRITICAL: Colors.error,
};

const STATUS_LABELS: Record<string, string> = {
  PENDING_OTP: 'Pending OTP',
  OTP_VERIFIED: 'Phone Verified',
  PROFILE_COMPLETE: 'Profile Complete',
  INTAKE_COMPLETE: 'Intake Submitted',
  CONSENT_GIVEN: 'Consent Accepted',
  ID_UPLOAD_PENDING: 'ID Upload Pending',
  ID_UNDER_REVIEW: 'ID Under Review',
  ID_VERIFIED: 'ID Verified',
  CONFIRMED: 'Verified ✓',
  FLAGGED: 'Needs Review',
  EMERGENCY_OVERRIDE: 'Override Applied',
  NOT_STARTED: 'Not Started',
};

export const VerificationStatusScreen: React.FC<Props> = ({ navigation, route }) => {
  const { bookingId } = route.params;
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    verificationService
      .getVerificationStatus(bookingId)
      .then(setData)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [bookingId]);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={Colors.primary} size="large" />
      </View>
    );
  }

  const tierColor = data?.riskTier ? TIER_COLORS[data.riskTier] ?? Colors.text : Colors.text;
  const statusLabel = STATUS_LABELS[data?.status ?? 'NOT_STARTED'] ?? data?.status;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Verification Status</Text>

      <Card style={styles.card}>
        <Text style={styles.label}>Current Status</Text>
        <Text style={[styles.status, { color: data?.status === 'CONFIRMED' ? Colors.success : Colors.text }]}>
          {statusLabel}
        </Text>

        {data?.riskTier && (
          <View style={styles.tierRow}>
            <Text style={styles.label}>Risk Level</Text>
            <View style={[styles.tierBadge, { backgroundColor: tierColor }]}>
              <Text style={styles.tierText}>{data.riskTier}</Text>
            </View>
          </View>
        )}
      </Card>

      {data?.pendingSteps?.length > 0 && (
        <Card style={styles.card}>
          <Text style={styles.sectionTitle}>Required Steps</Text>
          {data.pendingSteps.map((step: string) => (
            <View key={step} style={styles.stepRow}>
              <Text style={styles.stepDot}>○</Text>
              <Text style={styles.stepText}>{step.replace(/_/g, ' ')}</Text>
            </View>
          ))}
        </Card>
      )}

      {data?.status === 'CONFIRMED' || data?.status === 'CONSENT_GIVEN' ? (
        <Button
          title="Continue to Payment"
          onPress={() => navigation.navigate('Payment', { bookingId, amount: 0 })}
        />
      ) : (
        <Button
          title="Done"
          onPress={() => navigation.navigate('Tabs')}
          variant="outline"
        />
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { padding: 16, paddingBottom: 40 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  title: { fontSize: 22, fontWeight: '700', color: Colors.text, marginBottom: 16 },
  card: { padding: 16, marginBottom: 16 },
  label: { fontSize: 13, color: Colors.textMuted, marginBottom: 4 },
  status: { fontSize: 20, fontWeight: '700', marginBottom: 12 },
  tierRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  tierBadge: { paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12 },
  tierText: { color: Colors.white, fontWeight: '700', fontSize: 13 },
  sectionTitle: { fontSize: 16, fontWeight: '600', color: Colors.text, marginBottom: 10 },
  stepRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  stepDot: { fontSize: 16, color: Colors.primary, marginRight: 8 },
  stepText: { fontSize: 14, color: Colors.text },
});
