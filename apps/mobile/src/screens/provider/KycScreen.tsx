import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  TextInput,
  ActivityIndicator,
  Modal,
  Image,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Colors } from '../../constants/colors';
import {
  providerService,
  NmcVerificationPayload,
  VerificationDocumentsPayload,
} from '../../services/providerService';

// ─── Types ────────────────────────────────────────────────────────────────────

type WizardStep = 1 | 2 | 3;
type StepStatus = 'pending' | 'processing' | 'done' | 'failed';

interface VerificationProgress {
  records: StepStatus;
  documents: StepStatus;
  face: StepStatus;
  licenseId?: string;
}

interface PipelineStep {
  source: string;
  found: boolean;
}

interface LicenseStatus {
  status: string;
  verifiedAt?: string | null;
  rejectionReason?: string | null;
}

interface VerificationLog {
  id: string;
  status: string;
  registrationNumber: string;
  createdAt: string;
  licenseId?: string | null;
  verificationSource?: string;
  license?: LicenseStatus | null;
  rawResponse?: {
    issueLabel?: string;
    steps?: PipelineStep[];
  };
}

// ─── Step Circle ──────────────────────────────────────────────────────────────

interface StepCircleProps {
  number: number;
  label: string;
  status: StepStatus;
}

function StepCircle({ number, label, status }: StepCircleProps) {
  const bgMap: Record<StepStatus, string> = {
    pending: '#F1F5F9',
    processing: '#EFF6FF',
    done: '#DCFCE7',
    failed: '#FEE2E2',
  };
  const borderMap: Record<StepStatus, string> = {
    pending: '#CBD5E1',
    processing: '#3B82F6',
    done: '#22C55E',
    failed: '#EF4444',
  };
  const iconColorMap: Record<StepStatus, string> = {
    pending: '#94A3B8',
    processing: '#2563EB',
    done: '#16A34A',
    failed: '#DC2626',
  };

  let iconContent: React.ReactNode;
  if (status === 'processing') {
    iconContent = <ActivityIndicator size="small" color={iconColorMap.processing} />;
  } else {
    const icon = status === 'done' ? '✓' : status === 'failed' ? '✗' : `${number}`;
    iconContent = (
      <Text style={[circleStyles.icon, { color: iconColorMap[status] }]}>{icon}</Text>
    );
  }

  return (
    <View style={circleStyles.wrapper}>
      <View
        style={[
          circleStyles.circle,
          { backgroundColor: bgMap[status], borderColor: borderMap[status] },
        ]}
      >
        {iconContent}
      </View>
      <Text
        style={[
          circleStyles.label,
          (status === 'done' || status === 'failed') && { fontWeight: '600' },
        ]}
        numberOfLines={2}
      >
        {label}
      </Text>
    </View>
  );
}

const circleStyles = StyleSheet.create({
  wrapper: { alignItems: 'center', width: 60 },
  circle: {
    width: 50,
    height: 50,
    borderRadius: 25,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  icon: { fontSize: 18, fontWeight: '700' },
  label: { fontSize: 10, color: '#64748B', textAlign: 'center', lineHeight: 14 },
});

// ─── Helpers ──────────────────────────────────────────────────────────────────

const SOURCE_LABELS: Record<string, string> = {
  NMC_API: 'Official Records Check',
  SMC_PORTAL: 'Official Records Check',
  DIGILOCKER_CONSENT: 'DigiLocker Consent',
  DOCUMENT_UPLOAD: 'Document Upload',
  FACE: 'Face Verification',
  PIPELINE: 'Verification Pipeline',
};

function sourceLabel(source: string): string {
  return SOURCE_LABELS[source] ?? source.replace(/_/g, ' ');
}

// Returns a human-readable status label for a log, considering admin approval
function logStatusDisplay(log: VerificationLog): { text: string; isApproved: boolean } {
  if (log.license?.status === 'APPROVED') {
    return { text: '✅ Approved by Admin', isApproved: true };
  }
  if (log.license?.status === 'REJECTED') {
    const reason = log.license.rejectionReason ? ` — ${log.license.rejectionReason}` : '';
    return { text: `❌ Rejected by Admin${reason}`, isApproved: false };
  }
  if (log.rawResponse?.issueLabel) {
    if (log.rawResponse.issueLabel === 'Pending Admin Approval') {
      return { text: '🔒 Awaiting admin review', isApproved: false };
    }
    return { text: `⚠️ ${log.rawResponse.issueLabel}`, isApproved: false };
  }
  return { text: '', isApproved: false };
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export const KycScreen: React.FC = () => {
  const queryClient = useQueryClient();

  const [wizardStep, setWizardStep] = useState<WizardStep>(1);
  const [fullName, setFullName] = useState('');
  const [regNumber, setRegNumber] = useState('');
  const [yearOfAdmission, setYearOfAdmission] = useState('');
  const [selectedLog, setSelectedLog] = useState<VerificationLog | null>(null);
  // Show document upload view
  const [showDocumentUpload, setShowDocumentUpload] = useState(false);
  // Show face-checking state after selfie is taken
  const [faceChecking, setFaceChecking] = useState(false);
  // Staged document URIs before submission
  const [pendingAadhaarUri, setPendingAadhaarUri] = useState<string | null>(null);
  const [pendingCertUri, setPendingCertUri] = useState<string | null>(null);
  // Aadhaar number for API validation
  const [aadhaarNumber, setAadhaarNumber] = useState('');
  // Camera capture confirmation — shown after camera capture, before returning to doc list
  // base64 is only set for face capture (needed for API submission)
  const [captureConfirm, setCaptureConfirm] = useState<{
    uri: string;
    base64?: string | null;
    onConfirm: (uri: string, base64?: string | null) => void;
  } | null>(null);
  // "resume or start fresh" prompt state
  const [showResumePrompt, setShowResumePrompt] = useState(false);
  const progressRestoredRef = useRef(false);

  const [progress, setProgress] = useState<VerificationProgress>({
    records: 'pending',
    documents: 'pending',
    face: 'pending',
  });
  // true when the NMC API call itself errored (distinct from a genuine not-found result)
  const [nmcCheckError, setNmcCheckError] = useState(false);

  const { data: logs = [], isLoading: logsLoading } = useQuery({
    queryKey: ['verification-logs'],
    queryFn: providerService.getVerificationLogs,
  });

  // ── Restore progress from existing logs (runs once after logs load) ─────────

  useEffect(() => {
    if (progressRestoredRef.current) return;
    const logList = logs as VerificationLog[];
    if (logList.length === 0) return;
    progressRestoredRef.current = true;

    const pipelineLog = logList.find((l) => l.verificationSource === 'PIPELINE');
    const docLog = logList.find((l) => l.verificationSource === 'DOCUMENT_UPLOAD');
    const faceLog = logList.find(
      (l) => l.verificationSource === 'FACE' && l.status === 'SUCCESS',
    );

    if (!pipelineLog && !docLog && !faceLog) return;

    setShowResumePrompt(true);

    // Derive the latest licenseId from the most recent log that has one
    const licenseIdFromLog =
      pipelineLog?.licenseId ??
      docLog?.licenseId ??
      null;

    const restoredProgress: VerificationProgress = {
      records: pipelineLog
        ? pipelineLog.license?.status === 'APPROVED' || pipelineLog.status === 'SUCCESS'
          ? 'done'
          : 'failed'
        : 'pending',
      documents: docLog ? 'done' : 'pending',
      face: faceLog ? 'done' : 'pending',
      licenseId: licenseIdFromLog ?? undefined,
    };

    // Pre-populate name/reg fields from the pipeline log if available
    if (pipelineLog?.registrationNumber && pipelineLog.registrationNumber !== 'FACE_CHECK') {
      setRegNumber(pipelineLog.registrationNumber);
    }

    const _resolve = (resume: boolean) => {
      setShowResumePrompt(false);
      if (resume) {
        setProgress(restoredProgress);
        setWizardStep(3);
      }
    };

    Alert.alert(
      'Resume Verification',
      'You have an in-progress KYC verification. Would you like to continue from where you left off, or start fresh?',
      [
        {
          text: 'Start Fresh',
          style: 'destructive',
          onPress: () => _resolve(false),
        },
        {
          text: 'Continue',
          style: 'default',
          onPress: () => _resolve(true),
        },
      ],
      { cancelable: false },
    );
  }, [logs]);

  // ── Step 1 → 2 ─────────────────────────────────────────────────────────────

  const handleStep1Next = () => {
    if (!fullName.trim()) {
      Alert.alert('Required', 'Please enter your full name.');
      return;
    }
    setWizardStep(2);
  };

  // ── NMC Mutation ───────────────────────────────────────────────────────────

  const nmcMutation = useMutation({
    mutationFn: (payload: NmcVerificationPayload) =>
      providerService.submitNmcVerification(payload),
    onMutate: () => {
      setProgress((p) => ({ ...p, records: 'processing' }));
    },
    onSuccess: (data: any) => {
      setNmcCheckError(false);
      // The cached/already-approved path returns { status: 'APPROVED', cached: true }
      // with no `steps` property — treat that as "found" so the circle shows green.
      const isApproved = data?.status === 'APPROVED';
      const anyFound =
        isApproved || (data?.steps ?? []).some((s: PipelineStep) => s.found);
      setProgress((p) => ({
        ...p,
        records: anyFound ? 'done' : 'failed',
        licenseId: data?.license?.id ?? p.licenseId,
      }));
      queryClient.invalidateQueries({ queryKey: ['verification-logs'] });
    },
    onError: () => {
      setNmcCheckError(true);
      setProgress((p) => ({ ...p, records: 'failed' }));
    },
  });

  const handleStep2Submit = () => {
    if (!regNumber.trim()) {
      Alert.alert('Required', 'Please enter your registration number.');
      return;
    }
    const yearVal = yearOfAdmission.trim();
    const currentYear = new Date().getFullYear();
    if (!yearVal || !/^\d{4}$/.test(yearVal)) {
      Alert.alert('Required', 'Please enter a valid 4-digit year of registration.');
      return;
    }
    const yearNum = parseInt(yearVal, 10);
    if (yearNum < 1950 || yearNum > currentYear) {
      Alert.alert('Invalid Year', `Year of registration must be between 1950 and ${currentYear}.`);
      return;
    }
    setWizardStep(3);
    nmcMutation.mutate({
      fullName: fullName.trim(),
      nmcRegistrationNumber: regNumber.trim(),
      yearOfAdmission: yearVal,
    });
  };

  // ── Documents ──────────────────────────────────────────────────────────────

  const documentsMutation = useMutation({
    mutationFn: (payload: VerificationDocumentsPayload) =>
      providerService.submitVerificationDocuments(payload),
    onSuccess: () => {
      setProgress((p) => ({ ...p, documents: 'done' }));
      setShowDocumentUpload(false);
      queryClient.invalidateQueries({ queryKey: ['verification-logs'] });
    },
    onError: () => setProgress((p) => ({ ...p, documents: 'failed' })),
  });

  /** Launch camera with crop editing. After capture, shows the OK confirmation overlay. */
  const pickFromCamera = async (
    onConfirm: (uri: string, base64?: string | null) => void,
    opts?: { aspect?: [number, number]; base64?: boolean; front?: boolean },
  ) => {
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
      allowsEditing: true,
      aspect: opts?.aspect ?? [4, 3],
      base64: opts?.base64 ?? false,
      cameraType: opts?.front
        ? ImagePicker.CameraType.front
        : ImagePicker.CameraType.back,
    });
    if (!result.canceled && result.assets[0]) {
      const uri = result.assets[0].uri;
      const b64 = result.assets[0].base64 ?? null;
      setCaptureConfirm({ uri, base64: b64, onConfirm });
    }
  };

  /** Launch gallery picker — gallery has native confirmation, no extra step needed. */
  const pickFromGallery = async (onPick: (uri: string) => void) => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
      allowsEditing: true,
    });
    if (!result.canceled && result.assets[0]) {
      onPick(result.assets[0].uri);
    }
  };

  const promptImageSource = (
    title: string,
    onPick: (uri: string, base64?: string | null) => void,
  ) => {
    Alert.alert(title, 'How would you like to provide this document?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Take Photo',
        onPress: () => pickFromCamera(onPick),
      },
      {
        text: 'Choose from Gallery',
        onPress: () => pickFromGallery((uri) => onPick(uri, null)),
      },
    ]);
  };

  const handlePickAadhaar = useCallback(async () => {
    const libPerm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    const camPerm = await ImagePicker.requestCameraPermissionsAsync();
    if (libPerm.status !== 'granted' && camPerm.status !== 'granted') {
      Alert.alert('Permission Required', 'Camera or photo library access is needed.');
      return;
    }
    promptImageSource('Aadhaar Card', (uri) => setPendingAadhaarUri(uri));
  }, []);

  const handlePickCert = useCallback(async () => {
    const libPerm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    const camPerm = await ImagePicker.requestCameraPermissionsAsync();
    if (libPerm.status !== 'granted' && camPerm.status !== 'granted') {
      Alert.alert('Permission Required', 'Camera or photo library access is needed.');
      return;
    }
    promptImageSource('Medical Certificate', (uri) => setPendingCertUri(uri));
  }, []);

  const handleSubmitDocuments = useCallback(() => {
    if (!pendingAadhaarUri || !pendingCertUri) return;
    setProgress((p) => ({ ...p, documents: 'processing' }));
    documentsMutation.mutate({
      aadhaarDocumentUrl: pendingAadhaarUri,
      medicalCertificateUrl: pendingCertUri,
      licenseId: progress.licenseId,
      aadhaarNumber: aadhaarNumber.trim() || undefined,
    });
  }, [pendingAadhaarUri, pendingCertUri, progress.licenseId, aadhaarNumber]);

  // ── Face Verification ──────────────────────────────────────────────────────

  const faceMutation = useMutation({
    mutationFn: (base64: string) =>
      providerService.submitFaceVerification({ liveFaceData: base64 }),
    onSuccess: () => {
      setFaceChecking(false);
      setProgress((p) => ({ ...p, face: 'done' }));
      queryClient.invalidateQueries({ queryKey: ['verification-logs'] });
    },
    onError: () => {
      setFaceChecking(false);
      setProgress((p) => ({ ...p, face: 'failed' }));
    },
  });

  const handleFaceCapture = useCallback(async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(
        'Camera Permission Required',
        'Camera access is needed to capture your face for identity verification. Please enable it in Settings.',
      );
      return;
    }
    Alert.alert(
      'Face Verification',
      'Ensure you are in a well-lit area. Look directly at the camera and take a clear selfie.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Take Selfie',
          onPress: () =>
            pickFromCamera(
              (_uri, b64) => {
                if (b64) {
                  setFaceChecking(true);
                  setProgress((p) => ({ ...p, face: 'processing' }));
                  faceMutation.mutate(`data:image/jpeg;base64,${b64}`);
                }
              },
              { aspect: [1, 1], base64: true, front: true },
            ),
        },
      ],
    );
  }, []);

  // ── Delete Log ─────────────────────────────────────────────────────────────

  const deleteLogMutation = useMutation({
    mutationFn: (logId: string) => providerService.deleteVerificationLog(logId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['verification-logs'] });
    },
    onError: () => {
      Alert.alert('Error', 'Failed to delete log entry. Please try again.');
    },
  });

  const handleDeleteLog = (log: VerificationLog) => {
    Alert.alert(
      'Delete Log Entry',
      'Remove this verification attempt from your history? This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => deleteLogMutation.mutate(log.id),
        },
      ],
    );
  };

  // ── Derived state ──────────────────────────────────────────────────────────

  const isAutomatedDone =
    progress.records !== 'pending' && progress.records !== 'processing';

  const allStepsDone =
    progress.documents === 'done' &&
    progress.face === 'done';

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <View style={styles.root}>
      {/* Header */}
      <View style={styles.header}>
        {wizardStep > 1 && (
          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => setWizardStep((s) => (s - 1) as WizardStep)}
            disabled={wizardStep === 3 && nmcMutation.isPending}
          >
            <Text style={styles.backBtnText}>{'← Back'}</Text>
          </TouchableOpacity>
        )}
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>KYC Verification</Text>
          <Text style={styles.headerSub}>Step {wizardStep} of 3</Text>
        </View>
      </View>

      {/* Step dots */}
      <View style={styles.dotsRow}>
        {[1, 2, 3].map((s) => (
          <View
            key={s}
            style={[
              styles.dot,
              wizardStep === s && styles.dotActive,
              wizardStep > s && styles.dotDone,
            ]}
          />
        ))}
      </View>

      <ScrollView style={styles.scroll} keyboardShouldPersistTaps="handled">

        {/* ════ STEP 1 — Full Name ════ */}
        {wizardStep === 1 && (
          <View style={styles.stepBox}>
            <Text style={styles.stepTitle}>What is your full name?</Text>
            <Text style={styles.stepDesc}>
              Enter your name exactly as it appears on your medical registration.
            </Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. Dr. Priya Sharma"
              placeholderTextColor={Colors.textMuted}
              value={fullName}
              onChangeText={setFullName}
              autoCapitalize="words"
              autoFocus
              returnKeyType="next"
              onSubmitEditing={handleStep1Next}
            />
            <TouchableOpacity style={styles.primaryBtn} onPress={handleStep1Next}>
              <Text style={styles.primaryBtnText}>Continue</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* ════ STEP 2 — Registration Details ════ */}
        {wizardStep === 2 && (
          <View style={styles.stepBox}>
            <Text style={styles.stepTitle}>Registration Details</Text>
            <Text style={styles.stepDesc}>
              Enter your medical registration number and year. Your credentials will be
              verified against official healthcare authority records.
            </Text>

            <Text style={styles.label}>
              Registration Number <Text style={styles.req}>*</Text>
            </Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. MH-12345"
              placeholderTextColor={Colors.textMuted}
              value={regNumber}
              onChangeText={setRegNumber}
              autoCapitalize="characters"
              returnKeyType="next"
            />

            <Text style={styles.label}>
              Year of Registration <Text style={styles.req}>*</Text>
            </Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. 2015"
              placeholderTextColor={Colors.textMuted}
              value={yearOfAdmission}
              onChangeText={setYearOfAdmission}
              keyboardType="number-pad"
              maxLength={4}
              returnKeyType="done"
              onSubmitEditing={handleStep2Submit}
            />

            <TouchableOpacity
              style={[
                styles.primaryBtn,
                nmcMutation.isPending && styles.primaryBtnDisabled,
              ]}
              onPress={handleStep2Submit}
              disabled={nmcMutation.isPending}
            >
              <Text style={styles.primaryBtnText}>Start Verification</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* ════ STEP 3 — Progress & Actions ════ */}
        {wizardStep === 3 && !showDocumentUpload && (
          <View style={styles.stepBox}>
            <Text style={styles.stepTitle}>Verification Progress</Text>
            <Text style={styles.stepDesc}>
              Complete each step below. Your profile will go to admin review once all steps are done.
            </Text>

            {/* Progress circles */}
            <View style={styles.circlesRow}>
              {(
                [
                  { key: 'records' as keyof VerificationProgress, label: 'Official\nRecords' },
                  { key: 'documents' as keyof VerificationProgress, label: 'Documents' },
                  { key: 'face' as keyof VerificationProgress, label: 'Face\nCheck' },
                ]
              ).map((item, index) => (
                <React.Fragment key={String(item.key)}>
                  <StepCircle
                    number={index + 1}
                    label={item.label}
                    status={progress[item.key] as StepStatus}
                  />
                  {index < 2 && <View style={styles.circleLine} />}
                </React.Fragment>
              ))}
            </View>

            {/* Admin approval badge */}
            <View style={styles.adminBadge}>
              <Text style={styles.adminBadgeText}>{'🔒  Pending Admin Approval'}</Text>
            </View>

            {/* Automated check — loading */}
            {progress.records === 'processing' && (
              <View style={styles.card}>
                <ActivityIndicator color={Colors.primary} style={{ marginBottom: 10 }} />
                <Text style={styles.cardTitle}>Checking your registration…</Text>
                <Text style={styles.cardDesc}>
                  Verifying your registration against official medical authority records.
                  This takes a few seconds.
                </Text>
              </View>
            )}

            {/* Automated check — result */}
            {isAutomatedDone && (
              <View
                style={[
                  styles.card,
                  styles.resultCard,
                  {
                    borderLeftColor:
                      progress.records === 'done' ? '#22C55E' : '#EF4444',
                  },
                ]}
              >
                <Text style={styles.resultIcon}>
                  {progress.records === 'done' ? '✅' : '⚠️'}
                </Text>
                <View style={{ flex: 1 }}>
                  <Text style={styles.cardTitle}>Official Records Verification</Text>
                  <Text style={styles.cardDesc}>
                    {progress.records === 'done'
                      ? 'Your registration was found in official medical authority records.'
                      : nmcCheckError
                        ? 'Verification check encountered an issue. Our admin team will review manually.'
                        : 'Registration not found in official records. Our admin team will review manually.'}
                  </Text>
                </View>
              </View>
            )}

            {/* Document Upload — shown as action card */}
            {isAutomatedDone && progress.documents !== 'done' && (
              <View style={styles.card}>
                <Text style={styles.cardTitle}>{'📄 Upload Documents'}</Text>
                <Text style={styles.cardDesc}>
                  Upload your Aadhaar card and medical certificate for verification.
                </Text>
                <TouchableOpacity
                  style={[
                    styles.actionBtn,
                    documentsMutation.isPending && styles.actionBtnDisabled,
                  ]}
                  onPress={() => setShowDocumentUpload(true)}
                  disabled={documentsMutation.isPending}
                >
                  <Text style={styles.actionBtnText}>{'📷  Upload Documents'}</Text>
                </TouchableOpacity>
              </View>
            )}
            {progress.documents === 'done' && (
              <View style={[styles.card, styles.doneCard]}>
                <Text style={styles.doneCardText}>{'✅  Documents uploaded successfully'}</Text>
              </View>
            )}

            {/* Face Verification — checking state overlay */}
            {faceChecking && (
              <View style={[styles.card, styles.faceCheckingCard]}>
                <ActivityIndicator color={Colors.primary} size="large" style={{ marginBottom: 12 }} />
                <Text style={styles.faceCheckingTitle}>Checking Verification…</Text>
                <Text style={styles.faceCheckingDesc}>
                  Matching your selfie with the photo on your NMC / State Council registration.
                  Please wait.
                </Text>
              </View>
            )}

            {/* Face Verification */}
            {isAutomatedDone && progress.face !== 'done' && !faceChecking && (
              <View style={styles.card}>
                <Text style={styles.cardTitle}>{'🤳 Face Verification'}</Text>
                <Text style={styles.cardDesc}>
                  Take a clear selfie in a well-lit area to verify your identity. Your selfie
                  will be matched against your NMC or State Council registration photo.
                </Text>
                <TouchableOpacity
                  style={styles.actionBtn}
                  onPress={handleFaceCapture}
                >
                  <Text style={styles.actionBtnText}>{'📸  Take Selfie'}</Text>
                </TouchableOpacity>
              </View>
            )}
            {progress.face === 'done' && (
              <View style={[styles.card, styles.doneCard]}>
                <Text style={styles.doneCardText}>{'✅  Face verification complete'}</Text>
              </View>
            )}

            {/* All complete */}
            {allStepsDone && (
              <View style={[styles.card, styles.allDoneCard]}>
                <Text style={styles.allDoneTitle}>{'🎉 All steps completed!'}</Text>
                <Text style={styles.allDoneDesc}>
                  Your profile is now under admin review. You will be notified once approved.
                </Text>
              </View>
            )}

            {/* Verification History — visible only on this final page */}
            <View style={styles.historySection}>
              <Text style={styles.historySectionTitle}>Verification History</Text>
              {logsLoading ? (
                <ActivityIndicator color={Colors.primary} style={{ marginTop: 12 }} />
              ) : (logs as VerificationLog[]).length === 0 ? (
                <Text style={styles.noLogsText}>No verification attempts yet.</Text>
              ) : (
                (logs as VerificationLog[]).map((log) => {
                  const { text: statusText, isApproved } = logStatusDisplay(log);
                  return (
                    <TouchableOpacity
                      key={log.id}
                      style={[
                        styles.logItem,
                        isApproved && styles.logItemApproved,
                      ]}
                      onPress={() => setSelectedLog(log)}
                      activeOpacity={0.7}
                    >
                      <View style={styles.logRow}>
                        <Text style={styles.logSource} numberOfLines={1}>
                          {sourceLabel(log.verificationSource ?? log.status)}
                        </Text>
                        <View style={styles.logRowRight}>
                          <Text style={styles.logDate}>
                            {new Date(log.createdAt).toLocaleDateString('en-IN', {
                              day: '2-digit',
                              month: 'short',
                              year: 'numeric',
                            })}
                          </Text>
                          <TouchableOpacity
                            style={styles.logDeleteBtn}
                            onPress={() => handleDeleteLog(log)}
                            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                          >
                            <Text style={styles.logDeleteBtnText}>{'🗑'}</Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                      <Text style={styles.logReg}>Reg: {log.registrationNumber}</Text>
                      {statusText ? (
                        <Text
                          style={[
                            styles.logStatus,
                            isApproved && styles.logStatusApproved,
                          ]}
                        >
                          {statusText}
                        </Text>
                      ) : null}
                      <Text style={styles.logHint}>{'Tap to view details →'}</Text>
                    </TouchableOpacity>
                  );
                })
              )}
            </View>
          </View>
        )}

        {/* ════ STEP 3 — Document Upload sub-view ════ */}
        {wizardStep === 3 && showDocumentUpload && (
          <View style={styles.stepBox}>
            <>
              <TouchableOpacity
                style={styles.backBtnInline}
                onPress={() => setShowDocumentUpload(false)}
              >
                <Text style={styles.backBtnInlineText}>{'← Back'}</Text>
              </TouchableOpacity>

              <Text style={styles.stepTitle}>Upload Documents</Text>
              <Text style={styles.stepDesc}>
                Provide your Aadhaar card and medical certificate for identity
                and credential verification.
              </Text>

                {/* Aadhaar number validation */}
                <Text style={styles.label}>Aadhaar Number (optional)</Text>
                <TextInput
                  style={styles.input}
                  placeholder="12-digit Aadhaar number"
                  placeholderTextColor={Colors.textMuted}
                  value={aadhaarNumber}
                  onChangeText={(v) => setAadhaarNumber(v.replace(/\D/g, '').slice(0, 12))}
                  keyboardType="number-pad"
                  maxLength={12}
                />

                {/* Aadhaar photo picker */}
                <TouchableOpacity
                  style={[styles.docPickerRow, pendingAadhaarUri && styles.docPickerRowDone]}
                  onPress={handlePickAadhaar}
                  disabled={documentsMutation.isPending}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={styles.docPickerTitle}>{'🪪  Aadhaar Card'}</Text>
                    <Text style={styles.docPickerSub}>
                      {pendingAadhaarUri ? 'Photo selected ✓' : 'Tap to take photo or choose from gallery'}
                    </Text>
                  </View>
                  <Text style={styles.docPickerChevron}>
                    {pendingAadhaarUri ? '✓' : '›'}
                  </Text>
                </TouchableOpacity>

                {/* Medical certificate picker */}
                <TouchableOpacity
                  style={[styles.docPickerRow, pendingCertUri && styles.docPickerRowDone]}
                  onPress={handlePickCert}
                  disabled={documentsMutation.isPending}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={styles.docPickerTitle}>{'🎓  Medical Certificate'}</Text>
                    <Text style={styles.docPickerSub}>
                      {pendingCertUri ? 'Photo selected ✓' : 'Tap to take photo or choose from gallery'}
                    </Text>
                  </View>
                  <Text style={styles.docPickerChevron}>
                    {pendingCertUri ? '✓' : '›'}
                  </Text>
                </TouchableOpacity>

                {/* Submit button — enabled only after both docs captured */}
                <TouchableOpacity
                  style={[
                    styles.primaryBtn,
                    { marginTop: 8 },
                    (!pendingAadhaarUri || !pendingCertUri || documentsMutation.isPending) &&
                      styles.primaryBtnDisabled,
                  ]}
                  onPress={handleSubmitDocuments}
                  disabled={!pendingAadhaarUri || !pendingCertUri || documentsMutation.isPending}
                >
                  {documentsMutation.isPending ? (
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <ActivityIndicator color={Colors.white} />
                      <Text style={styles.primaryBtnText}>Uploading…</Text>
                    </View>
                  ) : (
                    <Text style={styles.primaryBtnText}>{'📤  Submit Documents'}</Text>
                  )}
                </TouchableOpacity>
              </>
          </View>
        )}

        {/* ── Log Detail Modal ── */}
        <Modal
          visible={!!selectedLog}
          animationType="slide"
          transparent
          onRequestClose={() => setSelectedLog(null)}
        >
          {selectedLog && (
            <View style={styles.modalOverlay}>
              <View style={[styles.modalContainer, { maxHeight: '85%' }]}>
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>Verification Detail</Text>
                  <TouchableOpacity onPress={() => setSelectedLog(null)}>
                    <Text style={styles.modalClose}>{'✕'}</Text>
                  </TouchableOpacity>
                </View>
                <ScrollView style={{ padding: 16 }}>
                  <Text style={styles.detailDate}>
                    {new Date(selectedLog.createdAt).toLocaleDateString('en-IN', {
                      day: '2-digit',
                      month: 'long',
                      year: 'numeric',
                    })}
                  </Text>
                  <Text style={styles.detailReg}>
                    Registration: {selectedLog.registrationNumber}
                  </Text>

                  <Text style={styles.detailSectionTitle}>Step Status</Text>

                  {(selectedLog.rawResponse?.steps ?? []).length > 0 ? (
                    (selectedLog.rawResponse?.steps ?? []).map((step) => (
                      <View key={step.source} style={styles.detailStep}>
                        <View
                          style={[
                            styles.detailCircle,
                            {
                              backgroundColor: step.found ? '#DCFCE7' : '#FEE2E2',
                            },
                          ]}
                        >
                          <Text style={{ fontSize: 14 }}>
                            {step.found ? '✓' : '✗'}
                          </Text>
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.detailStepLabel}>
                            {sourceLabel(step.source)}
                          </Text>
                          <Text style={styles.detailStepStatus}>
                            {step.found ? 'Verified' : 'Not found / Failed'}
                          </Text>
                        </View>
                      </View>
                    ))
                  ) : (
                    <View style={styles.detailStep}>
                      <View style={[styles.detailCircle, { backgroundColor: '#FEF3C7' }]}>
                        <Text style={{ fontSize: 14 }}>{'⟳'}</Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.detailStepLabel}>
                          {sourceLabel(
                            selectedLog.verificationSource ?? selectedLog.status,
                          )}
                        </Text>
                        <Text style={styles.detailStepStatus}>
                          {selectedLog.rawResponse?.issueLabel ?? 'Processing'}
                        </Text>
                      </View>
                    </View>
                  )}

                  {selectedLog.rawResponse?.issueLabel && (
                    <View style={styles.stuckBanner}>
                      <Text style={styles.stuckBannerText}>
                        {selectedLog.license?.status === 'APPROVED'
                          ? '✅ Admin has approved this submission'
                          : selectedLog.license?.status === 'REJECTED'
                            ? `❌ Admin rejected${selectedLog.license.rejectionReason ? ': ' + selectedLog.license.rejectionReason : ''}`
                            : selectedLog.rawResponse.issueLabel === 'Pending Admin Approval'
                              ? '🔒 All checks done — waiting for admin approval'
                              : `⚠️ Stuck at: ${selectedLog.rawResponse.issueLabel}`}
                      </Text>
                    </View>
                  )}
                  {!selectedLog.rawResponse?.issueLabel && selectedLog.license?.status === 'APPROVED' && (
                    <View style={[styles.stuckBanner, { backgroundColor: '#F0FDF4', borderColor: '#86EFAC' }]}>
                      <Text style={[styles.stuckBannerText, { color: '#16A34A' }]}>
                        ✅ Admin has approved this submission
                      </Text>
                    </View>
                  )}
                </ScrollView>
              </View>
            </View>
          )}
        </Modal>
      </ScrollView>

      {/* ── Global captureConfirm overlay (face or document capture) ── */}
      <Modal
        visible={!!captureConfirm}
        animationType="fade"
        transparent
        onRequestClose={() => setCaptureConfirm(null)}
      >
        {captureConfirm && (
          <View style={styles.captureModalOverlay}>
            <View style={styles.captureConfirmWrapper}>
              <Text style={styles.captureConfirmTitle}>Photo Captured</Text>
              <Text style={styles.captureConfirmSub}>
                Looks good? Tap OK to use this photo, or Retake to try again.
              </Text>
              <Image
                source={{ uri: captureConfirm.uri }}
                style={styles.capturePreview}
                resizeMode="cover"
              />
              <View style={styles.captureConfirmActions}>
                <TouchableOpacity
                  style={styles.captureRetakeBtn}
                  onPress={() => setCaptureConfirm(null)}
                >
                  <Text style={styles.captureRetakeBtnText}>Retake</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.captureOkBtn}
                  onPress={() => {
                    captureConfirm.onConfirm(captureConfirm.uri, captureConfirm.base64);
                    setCaptureConfirm(null);
                  }}
                >
                  <Text style={styles.captureOkBtnText}>OK</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        )}
      </Modal>
    </View>
  );
};

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.background },

  header: {
    backgroundColor: Colors.primary,
    paddingTop: 24,
    paddingBottom: 14,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
  },
  backBtn: { paddingRight: 12 },
  backBtnText: { color: 'rgba(255,255,255,0.85)', fontSize: 15, fontWeight: '600' },
  headerCenter: { flex: 1 },
  headerTitle: { fontSize: 20, fontWeight: '800', color: Colors.white },
  headerSub: { fontSize: 12, color: 'rgba(255,255,255,0.7)', marginTop: 2 },

  dotsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 10,
    backgroundColor: Colors.primary,
  },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: 'rgba(255,255,255,0.3)' },
  dotActive: { backgroundColor: Colors.white, width: 24 },
  dotDone: { backgroundColor: 'rgba(255,255,255,0.65)' },

  scroll: { flex: 1 },
  stepBox: { padding: 20 },
  stepTitle: { fontSize: 22, fontWeight: '800', color: Colors.text, marginBottom: 8 },
  stepDesc: { fontSize: 14, color: Colors.textMuted, marginBottom: 24, lineHeight: 20 },

  label: { fontSize: 13, fontWeight: '600', color: Colors.text, marginBottom: 6 },
  req: { color: Colors.error },
  input: {
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    padding: 14,
    fontSize: 15,
    color: Colors.text,
    backgroundColor: Colors.white,
    marginBottom: 16,
  },

  primaryBtn: {
    backgroundColor: Colors.primary,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  primaryBtnDisabled: { backgroundColor: Colors.textMuted },
  primaryBtnText: { fontSize: 16, fontWeight: '700', color: Colors.white },

  circlesRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'center',
    marginBottom: 16,
    paddingHorizontal: 4,
  },
  circleLine: {
    flex: 1,
    height: 2,
    backgroundColor: '#E2E8F0',
    alignSelf: 'center',
    marginBottom: 22,
    marginHorizontal: 2,
  },
  adminBadge: {
    alignSelf: 'center',
    backgroundColor: '#EEF2FF',
    borderRadius: 20,
    paddingVertical: 7,
    paddingHorizontal: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#C7D2FE',
  },
  adminBadgeText: { fontSize: 13, fontWeight: '600', color: '#4F46E5' },

  card: {
    backgroundColor: Colors.white,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
  },
  resultCard: { flexDirection: 'row', alignItems: 'center', borderLeftWidth: 3, gap: 12 },
  resultIcon: { fontSize: 24 },
  cardTitle: { fontSize: 15, fontWeight: '700', color: Colors.text, marginBottom: 6 },
  cardDesc: { fontSize: 13, color: Colors.textMuted, marginBottom: 14, lineHeight: 18 },
  actionBtn: {
    backgroundColor: Colors.primary,
    borderRadius: 10,
    padding: 12,
    alignItems: 'center',
  },
  actionBtnDisabled: { backgroundColor: Colors.textMuted },
  actionBtnText: { fontSize: 14, fontWeight: '700', color: Colors.white },
  doneCard: { backgroundColor: '#F0FDF4', borderWidth: 1, borderColor: '#86EFAC' },
  doneCardText: { fontSize: 14, fontWeight: '600', color: '#16A34A', textAlign: 'center' },
  allDoneCard: { backgroundColor: '#F0FDF4', borderWidth: 1.5, borderColor: '#22C55E' },
  allDoneTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#16A34A',
    textAlign: 'center',
  },
  allDoneDesc: { fontSize: 13, color: '#166534', textAlign: 'center', marginTop: 6 },

  faceCheckingCard: {
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
    alignItems: 'center',
    paddingVertical: 24,
  },
  faceCheckingTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.primary,
    textAlign: 'center',
    marginBottom: 8,
  },
  faceCheckingDesc: {
    fontSize: 13,
    color: '#1E40AF',
    textAlign: 'center',
    lineHeight: 18,
  },

  backBtnInline: { marginBottom: 16 },
  backBtnInlineText: { color: Colors.primary, fontSize: 15, fontWeight: '600' },

  historySection: { paddingHorizontal: 16, marginTop: 8 },
  historySectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 12,
  },
  noLogsText: {
    fontSize: 13,
    color: Colors.textMuted,
    textAlign: 'center',
    marginTop: 8,
  },
  logItem: {
    backgroundColor: Colors.white,
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    elevation: 1,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 },
  },
  logItemApproved: {
    borderWidth: 1,
    borderColor: '#86EFAC',
    backgroundColor: '#F0FDF4',
  },
  logRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  logRowRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  logSource: { fontSize: 13, fontWeight: '700', color: Colors.text, flex: 1 },
  logDate: { fontSize: 11, color: Colors.textMuted, marginLeft: 8 },
  logDeleteBtn: { padding: 2 },
  logDeleteBtnText: { fontSize: 14 },
  logReg: { fontSize: 12, color: Colors.textMuted },
  logStatus: { fontSize: 12, color: '#D97706', marginTop: 4, fontWeight: '600' },
  logStatusApproved: { color: '#16A34A' },
  logHint: { fontSize: 11, color: Colors.primary, marginTop: 6, fontStyle: 'italic' },

  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: Colors.white,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  modalTitle: { fontSize: 17, fontWeight: '700', color: Colors.text },
  modalClose: { fontSize: 18, color: Colors.textMuted, padding: 4 },

  detailDate: { fontSize: 12, color: Colors.textMuted, marginBottom: 4 },
  detailReg: { fontSize: 14, fontWeight: '600', color: Colors.text, marginBottom: 16 },
  detailSectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 10,
  },
  detailStep: { flexDirection: 'row', alignItems: 'center', marginBottom: 12, gap: 12 },
  detailCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  detailStepLabel: { fontSize: 13, fontWeight: '600', color: Colors.text },
  detailStepStatus: { fontSize: 12, color: Colors.textMuted, marginTop: 2 },
  stuckBanner: {
    backgroundColor: '#FEF3C7',
    borderRadius: 10,
    padding: 12,
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  stuckBannerText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#92400E',
    textAlign: 'center',
  },

  docPickerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    padding: 14,
    marginBottom: 12,
  },
  docPickerRowDone: {
    borderColor: '#22C55E',
    backgroundColor: '#F0FDF4',
  },
  docPickerTitle: { fontSize: 14, fontWeight: '700', color: Colors.text, marginBottom: 4 },
  docPickerSub: { fontSize: 12, color: Colors.textMuted },
  docPickerChevron: { fontSize: 20, color: Colors.textMuted, marginLeft: 8 },

  // ── Capture confirmation overlay ────────────────────────────────────────────
  captureModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  captureConfirmWrapper: {
    backgroundColor: Colors.white,
    borderRadius: 20,
    padding: 20,
    width: '100%',
    alignItems: 'center',
  },
  captureConfirmTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: Colors.text,
    marginBottom: 6,
  },
  captureConfirmSub: {
    fontSize: 13,
    color: Colors.textMuted,
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 18,
  },
  capturePreview: {
    width: '100%',
    height: 260,
    borderRadius: 14,
    marginBottom: 20,
    backgroundColor: '#F1F5F9',
  },
  captureConfirmActions: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  captureRetakeBtn: {
    flex: 1,
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: Colors.primary,
  },
  captureRetakeBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.primary,
  },
  captureOkBtn: {
    flex: 1,
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
    backgroundColor: Colors.primary,
  },
  captureOkBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.white,
  },
});
