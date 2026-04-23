import React, { useCallback, useEffect, useState } from 'react';
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
import {
  verificationService,
  SelfServeStatus,
  SelfServeStep,
} from '../../services/verificationService';
import { PatientStackParamList } from '../../navigation/PatientNavigator';

type Props = {
  navigation: NativeStackNavigationProp<PatientStackParamList, 'PatientKyc'>;
};

const STEP_LABELS: Record<SelfServeStep, string> = {
  PERSONAL_DETAILS: 'Personal Details',
  ADDRESS: 'Residential Address',
  ID_UPLOAD: 'Upload Aadhaar',
  FACE_CAPTURE: 'Face Verification',
  GUARDIAN: 'Guardian Details',
  REVIEW: 'Review & Submit',
};

type KycRoute =
  | 'PatientKycPersonal'
  | 'PatientKycAddress'
  | 'PatientKycIdUpload'
  | 'PatientKycAadhaarUpload'
  | 'PatientKycFaceCapture'
  | 'PatientKycGuardian'
  | 'PatientKycReview';

const STEP_TO_ROUTE: Record<SelfServeStep, KycRoute> = {
  PERSONAL_DETAILS: 'PatientKycPersonal',
  ADDRESS: 'PatientKycAddress',
  // ID_UPLOAD now points at the new Aadhaar OCR screen. The legacy
  // PatientKycIdUpload screen remains registered as a fallback that the new
  // screen can navigate to via "Use manual entry" when the kyc-ml service
  // is not available in the current environment.
  ID_UPLOAD: 'PatientKycAadhaarUpload',
  FACE_CAPTURE: 'PatientKycFaceCapture',
  GUARDIAN: 'PatientKycGuardian',
  REVIEW: 'PatientKycReview',
};

/**
 * Helper to navigate to one of the no-param KYC wizard routes. Centralised
 * so the slightly-awkward `navigate(name)` overload (which requires the
 * caller to pre-select a screen-name literal) is only suppressed in one
 * place rather than at every call site.
 */
const navigateToKyc = (
  navigation: NativeStackNavigationProp<PatientStackParamList, 'PatientKyc'>,
  route: KycRoute,
) => {
  // Each KycRoute target has `undefined` params in PatientStackParamList,
  // so this is type-safe at runtime; the cast is only needed because the
  // navigate overload narrows on the literal `name` argument.
  (navigation.navigate as (name: KycRoute) => void)(route);
};

export const PatientKycScreen: React.FC<Props> = ({ navigation }) => {
  const [data, setData] = useState<SelfServeStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const loadStatus = useCallback(() => {
    setLoading(true);
    setLoadError(null);
    // selfStart is idempotent — creates the verification row if missing,
    // returns the current status either way.
    verificationService
      .selfStart()
      .then((res) => setData(res))
      .catch(() => {
        // Fall back to plain status fetch if selfStart fails (e.g. profile
        // not yet created — happens before onboarding).
        verificationService
          .getMyVerificationStatus()
          .then((res) => setData(res))
          .catch((err) => {
            // eslint-disable-next-line no-console
            console.warn('[PatientKyc] Failed to load verification status', err);
            setLoadError(
              "We couldn't load your verification status. Please complete your profile first.",
            );
          });
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    loadStatus();
  }, [loadStatus]);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={Colors.primary} size="large" />
      </View>
    );
  }

  if (loadError || !data) {
    return (
      <View style={styles.center}>
        <Text style={styles.bigIcon}>⚠️</Text>
        <Text style={styles.title}>Identity Verification</Text>
        <Text style={styles.subtitle}>
          {loadError ?? 'Please complete your profile first.'}
        </Text>
        <Button title="Retry" onPress={loadStatus} variant="outline" />
      </View>
    );
  }

  const isVerified =
    data.status === 'CONFIRMED' || data.status === 'EMERGENCY_OVERRIDE';
  const isFlagged = data.status === 'FLAGGED';
  const allSteps: SelfServeStep[] = data.isMinor
    ? ['PERSONAL_DETAILS', 'ADDRESS', 'ID_UPLOAD', 'FACE_CAPTURE', 'GUARDIAN', 'REVIEW']
    : ['PERSONAL_DETAILS', 'ADDRESS', 'ID_UPLOAD', 'FACE_CAPTURE', 'REVIEW'];
  const completed = new Set(data.completedSteps);
  const nextStep = data.nextStep;

  const goToNext = () => {
    if (!nextStep) return;
    navigateToKyc(navigation, STEP_TO_ROUTE[nextStep]);
  };

  const goToStep = (step: SelfServeStep) => {
    navigateToKyc(navigation, STEP_TO_ROUTE[step]);
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.iconRow}>
        <Text style={styles.bigIcon}>{isVerified ? '✅' : isFlagged ? '⚠️' : '🪪'}</Text>
      </View>
      <Text style={styles.title}>Identity Verification</Text>
      <Text style={styles.subtitle}>
        {isVerified
          ? 'Your identity is verified. You can book consultations freely.'
          : isFlagged
            ? 'Your verification is under manual review.'
            : 'Complete the steps below to start booking consultations.'}
      </Text>

      {!isVerified && !isFlagged && (
        <Card style={styles.card}>
          <Text style={styles.section}>Verification Steps</Text>
          {allSteps.map((step, idx) => {
            const isDone = completed.has(step);
            const isCurrent = nextStep === step;
            return (
              <View key={step} style={styles.stepRow}>
                <View
                  style={[
                    styles.stepDot,
                    isDone
                      ? styles.stepDotDone
                      : isCurrent
                        ? styles.stepDotCurrent
                        : styles.stepDotPending,
                  ]}
                >
                  <Text style={styles.stepDotText}>
                    {isDone ? '✓' : idx + 1}
                  </Text>
                </View>
                <Text
                  style={[
                    styles.stepLabel,
                    isDone && styles.stepLabelDone,
                    isCurrent && styles.stepLabelCurrent,
                  ]}
                >
                  {STEP_LABELS[step]}
                </Text>
                {isDone && !isVerified && (
                  <Text style={styles.editLink} onPress={() => goToStep(step)}>
                    Edit
                  </Text>
                )}
              </View>
            );
          })}
        </Card>
      )}

      {isVerified && (
        <Card style={{ ...styles.card, ...styles.successCard }}>
          <Text style={styles.successText}>
            🎉 You&apos;re all set. Your identity has been verified — no further
            action is required.
          </Text>
        </Card>
      )}

      {isFlagged && (
        <Card style={{ ...styles.card, ...styles.flagCard }}>
          <Text style={styles.flagText}>
            ⚠️ Our team is reviewing your submission and will contact you
            shortly. Please reach out to support if you have questions.
          </Text>
        </Card>
      )}

      {!isVerified && nextStep && (
        <Button
          title={
            data.completedSteps.length === 0
              ? 'Start verification'
              : `Continue: ${STEP_LABELS[nextStep]}`
          }
          onPress={goToNext}
        />
      )}

      <Button
        title="Back to Profile"
        onPress={() => navigation.goBack()}
        variant="outline"
        style={{ marginTop: 12 }}
      />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { padding: 20, paddingBottom: 40 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24, gap: 12 },
  iconRow: { alignItems: 'center', marginBottom: 8, marginTop: 4 },
  bigIcon: { fontSize: 56 },
  title: { fontSize: 22, fontWeight: '800', color: Colors.text, textAlign: 'center', marginBottom: 6 },
  subtitle: { fontSize: 14, color: Colors.textMuted, textAlign: 'center', marginBottom: 20, lineHeight: 20 },
  card: { padding: 16, marginBottom: 16 },
  section: { fontSize: 16, fontWeight: '700', color: Colors.text, marginBottom: 12 },
  stepRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8 },
  stepDot: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  stepDotDone: { backgroundColor: Colors.success },
  stepDotCurrent: { backgroundColor: Colors.primary },
  stepDotPending: { backgroundColor: Colors.border },
  stepDotText: { fontSize: 13, fontWeight: '700', color: Colors.white },
  stepLabel: { fontSize: 14, color: Colors.text, flex: 1 },
  stepLabelDone: { color: Colors.textMuted },
  stepLabelCurrent: { fontWeight: '700' },
  editLink: { fontSize: 12, color: Colors.primary, fontWeight: '700' },
  successCard: { backgroundColor: '#F0FDF4' },
  successText: { fontSize: 14, color: '#166534', lineHeight: 20 },
  flagCard: { backgroundColor: '#FFFBEB' },
  flagText: { fontSize: 14, color: '#92400E', lineHeight: 20 },
});
