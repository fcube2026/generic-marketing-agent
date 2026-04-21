import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Colors } from '../../constants/colors';
import { Button } from '../../components/common/Button';
import { Card } from '../../components/common/Card';
import { verificationService } from '../../services/verificationService';
import { PatientStackParamList } from '../../navigation/PatientNavigator';

type Props = {
  navigation: NativeStackNavigationProp<PatientStackParamList, 'PatientKyc'>;
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

const STATUS_ICONS: Record<string, string> = {
  CONFIRMED: '✅',
  FLAGGED: '⚠️',
  ID_UNDER_REVIEW: '🔍',
  ID_VERIFIED: '🪪',
  NOT_STARTED: '📋',
};

export const PatientKycScreen: React.FC<Props> = ({ navigation }) => {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    verificationService
      .getMyVerificationStatus()
      .then(setData)
      .catch(() => setError('Failed to load verification status.'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={Colors.primary} size="large" />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>{error}</Text>
        <Button title="Go Back" onPress={() => navigation.goBack()} variant="outline" />
      </View>
    );
  }

  const status = data?.status ?? 'NOT_STARTED';
  const tierColor = data?.riskTier ? TIER_COLORS[data.riskTier] ?? Colors.text : Colors.text;
  const statusLabel = STATUS_LABELS[status] ?? status;
  const statusIcon = STATUS_ICONS[status] ?? '📋';
  const isVerified = status === 'CONFIRMED';

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.iconRow}>
        <Text style={styles.bigIcon}>{statusIcon}</Text>
      </View>

      <Text style={styles.title}>Identity Verification</Text>
      <Text style={styles.subtitle}>
        Your KYC (Know Your Customer) status is shown below.
      </Text>

      <Card style={styles.card}>
        <Text style={styles.label}>Current Status</Text>
        <Text style={[styles.status, { color: isVerified ? Colors.success : Colors.text }]}>
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
          <Text style={styles.hint}>
            Complete a booking to proceed through the verification steps.
          </Text>
        </Card>
      )}

      {isVerified && (
        <Card style={styles.successCard}>
          <Text style={styles.successText}>
            🎉 Your identity has been verified. You can now book consultations without additional verification steps.
          </Text>
        </Card>
      )}

      {status === 'FLAGGED' && (
        <Card style={styles.flagCard}>
          <Text style={styles.flagText}>
            ⚠️ Your verification requires manual review. Our team will contact you shortly. If you have questions, please reach out to support.
          </Text>
        </Card>
      )}

      <Button title="Back to Profile" onPress={() => navigation.goBack()} variant="outline" />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { padding: 16, paddingBottom: 40 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  iconRow: { alignItems: 'center', marginBottom: 8, marginTop: 8 },
  bigIcon: { fontSize: 56 },
  title: { fontSize: 22, fontWeight: '700', color: Colors.text, textAlign: 'center', marginBottom: 6 },
  subtitle: { fontSize: 14, color: Colors.textMuted, textAlign: 'center', marginBottom: 20, lineHeight: 20 },
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
  hint: { fontSize: 12, color: Colors.textMuted, marginTop: 8, fontStyle: 'italic' },
  successCard: { padding: 16, marginBottom: 16, backgroundColor: '#F0FDF4' },
  successText: { fontSize: 14, color: '#166534', lineHeight: 20 },
  flagCard: { padding: 16, marginBottom: 16, backgroundColor: '#FFFBEB' },
  flagText: { fontSize: 14, color: '#92400E', lineHeight: 20 },
  errorText: { fontSize: 15, color: Colors.error, marginBottom: 16, textAlign: 'center' },
});
