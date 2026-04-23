import React, { useState, useCallback } from 'react';
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
  FlatList,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Colors } from '../../constants/colors';
import {
  providerService,
  NmcVerificationPayload,
  VerificationDocumentsPayload,
} from '../../services/providerService';
import { INDIAN_STATE_COUNCILS } from '../../constants/stateCouncils';

// ─── Types ────────────────────────────────────────────────────────────────────

type WizardStep = 1 | 2 | 3;
type StepStatus = 'pending' | 'processing' | 'done' | 'failed';

interface VerificationProgress {
  nmc: StepStatus;
  smc: StepStatus;
  digilocker: StepStatus;
  documents: StepStatus;
  face: StepStatus;
  licenseId?: string;
}

interface PipelineStep {
  source: string;
  found: boolean;
}

interface VerificationLog {
  id: string;
  status: string;
  registrationNumber: string;
  createdAt: string;
  verificationSource?: string;
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
  NMC_API: 'NMC / Surepass Check',
  SMC_PORTAL: 'State Medical Council Portal',
  DIGILOCKER_CONSENT: 'DigiLocker Consent',
  DOCUMENT_UPLOAD: 'Document Upload (OCR)',
  FACE: 'Face Verification',
  PIPELINE: 'Verification Pipeline',
};

function sourceLabel(source: string): string {
  return SOURCE_LABELS[source] ?? source.replace(/_/g, ' ');
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export const KycScreen: React.FC = () => {
  const queryClient = useQueryClient();

  const [wizardStep, setWizardStep] = useState<WizardStep>(1);
  const [fullName, setFullName] = useState('');
  const [regNumber, setRegNumber] = useState('');
  const [stateCouncil, setStateCouncil] = useState('');
  const [showCouncilPicker, setShowCouncilPicker] = useState(false);
  const [councilSearch, setCouncilSearch] = useState('');
  const [selectedLog, setSelectedLog] = useState<VerificationLog | null>(null);
  // Show document upload view
  const [showDocumentUpload, setShowDocumentUpload] = useState(false);
  // Show face-checking state after selfie is taken
  const [faceChecking, setFaceChecking] = useState(false);
  // Staged document URIs before submission
  const [pendingAadhaarUri, setPendingAadhaarUri] = useState<string | null>(null);
  const [pendingCertUri, setPendingCertUri] = useState<string | null>(null);

  const [progress, setProgress] = useState<VerificationProgress>({
    nmc: 'pending',
    smc: 'pending',
    digilocker: 'pending',
    documents: 'pending',
    face: 'pending',
  });

  const { data: logs = [], isLoading: logsLoading } = useQuery({
    queryKey: ['verification-logs'],
    queryFn: providerService.getVerificationLogs,
  });

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
      setProgress((p) => ({ ...p, nmc: 'processing', smc: 'pending' }));
    },
    onSuccess: (data: any) => {
      const nmcStep = (data?.steps ?? []).find((s: PipelineStep) => s.source === 'NMC_API');
      const smcStep = (data?.steps ?? []).find((s: PipelineStep) => s.source === 'SMC_PORTAL');
      setProgress((p) => ({
        ...p,
        nmc: nmcStep?.found ? 'done' : 'failed',
        smc: smcStep?.found ? 'done' : 'failed',
        licenseId: data?.license?.id ?? p.licenseId,
      }));
      queryClient.invalidateQueries({ queryKey: ['verification-logs'] });
    },
    onError: () => {
      setProgress((p) => ({ ...p, nmc: 'failed', smc: 'failed' }));
    },
  });

  const handleStep2Submit = () => {
    if (!regNumber.trim()) {
      Alert.alert('Required', 'Please enter your registration number.');
      return;
    }
    if (!stateCouncil) {
      Alert.alert('Required', 'Please select your State Medical Council.');
      return;
    }
    setWizardStep(3);
    nmcMutation.mutate({
      fullName: fullName.trim(),
      nmcRegistrationNumber: regNumber.trim(),
      stateCouncil,
      yearOfAdmission: new Date().getFullYear().toString(),
    });
  };

  // ── DigiLocker ─────────────────────────────────────────────────────────────

  const digilockerMutation = useMutation({
    mutationFn: () => providerService.recordDigilockerConsent(progress.licenseId),
    onMutate: () => setProgress((p) => ({ ...p, digilocker: 'processing' })),
    onSuccess: () =>
      setProgress((p) => ({ ...p, digilocker: 'done', documents: 'done' })),
    onError: () => setProgress((p) => ({ ...p, digilocker: 'failed' })),
  });

  const handleDigilockerConsent = () => {
    Alert.alert(
      'DigiLocker Consent',
      'By tapping "I Agree", you authorise Curex24 to fetch your Aadhaar and medical registration documents from DigiLocker for verification.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'I Agree',
          onPress: () => {
            digilockerMutation.mutate();
          },
        },
      ],
    );
  };

  // ── Documents ──────────────────────────────────────────────────────────────

  const documentsMutation = useMutation({
    mutationFn: (payload: VerificationDocumentsPayload) =>
      providerService.submitVerificationDocuments(payload),
    onSuccess: () => setProgress((p) => ({ ...p, documents: 'done' })),
    onError: () => setProgress((p) => ({ ...p, documents: 'failed' })),
  });

  const pickImage = async (fromCamera: boolean): Promise<string | null> => {
    if (fromCamera) {
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.8,
        allowsEditing: true,
        aspect: [4, 3],
      });
      if (!result.canceled && result.assets[0]) return result.assets[0].uri;
    } else {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.8,
        allowsEditing: true,
      });
      if (!result.canceled && result.assets[0]) return result.assets[0].uri;
    }
    return null;
  };

  const promptImageSource = (title: string, onPick: (uri: string) => void) => {
    Alert.alert(title, 'How would you like to provide this document?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Take Photo',
        onPress: async () => {
          const uri = await pickImage(true);
          if (uri) onPick(uri);
        },
      },
      {
        text: 'Choose from Gallery',
        onPress: async () => {
          const uri = await pickImage(false);
          if (uri) onPick(uri);
        },
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
    });
  }, [pendingAadhaarUri, pendingCertUri, progress.licenseId]);

  // ── Face Verification ──────────────────────────────────────────────────────

  const faceMutation = useMutation({
    mutationFn: (base64: string) =>
      providerService.submitFaceVerification({ liveFaceData: base64 }),
    onSuccess: () => {
      setFaceChecking(false);
      setProgress((p) => ({ ...p, face: 'done' }));
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
          onPress: async () => {
            const result = await ImagePicker.launchCameraAsync({
              mediaTypes: ImagePicker.MediaTypeOptions.Images,
              quality: 0.7,
              allowsEditing: true,
              aspect: [1, 1],
              cameraType: ImagePicker.CameraType.front,
              base64: true,
            });
            if (!result.canceled && result.assets[0]?.base64) {
              setFaceChecking(true);
              setProgress((p) => ({ ...p, face: 'processing' }));
              faceMutation.mutate(`data:image/jpeg;base64,${result.assets[0].base64}`);
            }
          },
        },
      ],
    );
  }, []);

  // ── Derived state ──────────────────────────────────────────────────────────

  const filteredCouncils = INDIAN_STATE_COUNCILS.filter((c) =>
    c.toLowerCase().includes(councilSearch.toLowerCase()),
  );

  const isAutomatedDone =
    progress.nmc !== 'pending' && progress.nmc !== 'processing';

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

        {/* ════ STEP 2 — Registration + Council ════ */}
        {wizardStep === 2 && (
          <View style={styles.stepBox}>
            <Text style={styles.stepTitle}>Registration Details</Text>
            <Text style={styles.stepDesc}>
              Enter your medical registration number and select your State Medical Council.
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
              State Medical Council <Text style={styles.req}>*</Text>
            </Text>
            <TouchableOpacity
              style={[styles.input, styles.pickerBtn]}
              onPress={() => {
                setCouncilSearch('');
                setShowCouncilPicker(true);
              }}
            >
              <Text style={stateCouncil ? styles.pickerValue : styles.pickerPlaceholder}>
                {stateCouncil || 'Select your State Medical Council'}
              </Text>
              <Text style={styles.chevron}>{'▼'}</Text>
            </TouchableOpacity>

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
                  { key: 'nmc' as keyof VerificationProgress, label: 'NMC\nCheck' },
                  { key: 'smc' as keyof VerificationProgress, label: 'SMC\nPortal' },
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
                  {index < 3 && <View style={styles.circleLine} />}
                </React.Fragment>
              ))}
            </View>

            {/* Admin approval badge */}
            <View style={styles.adminBadge}>
              <Text style={styles.adminBadgeText}>{'🔒  Pending Admin Approval'}</Text>
            </View>

            {/* Automated check — loading */}
            {progress.nmc === 'processing' && (
              <View style={styles.card}>
                <ActivityIndicator color={Colors.primary} style={{ marginBottom: 10 }} />
                <Text style={styles.cardTitle}>Checking your registration…</Text>
                <Text style={styles.cardDesc}>
                  Verifying with NMC and State Medical Council. This takes a few seconds.
                </Text>
              </View>
            )}

            {/* Automated check — results */}
            {isAutomatedDone && (
              <>
                <View
                  style={[
                    styles.card,
                    styles.resultCard,
                    {
                      borderLeftColor:
                        progress.nmc === 'done' ? '#22C55E' : '#EF4444',
                    },
                  ]}
                >
                  <Text style={styles.resultIcon}>
                    {progress.nmc === 'done' ? '✅' : '❌'}
                  </Text>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.cardTitle}>NMC Verification</Text>
                    <Text style={styles.cardDesc}>
                      {progress.nmc === 'done'
                        ? 'Found in National Medical Commission records.'
                        : 'Not found in NMC records. Our admin team will review manually.'}
                    </Text>
                  </View>
                </View>

                <View
                  style={[
                    styles.card,
                    styles.resultCard,
                    {
                      borderLeftColor:
                        progress.smc === 'done' ? '#22C55E' : '#EF4444',
                    },
                  ]}
                >
                  <Text style={styles.resultIcon}>
                    {progress.smc === 'done' ? '✅' : '❌'}
                  </Text>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.cardTitle}>State Medical Council</Text>
                    <Text style={styles.cardDesc}>
                      {progress.smc === 'done'
                        ? `Verified on ${stateCouncil}.`
                        : 'Not found on the State Medical Council portal. Admin will review.'}
                    </Text>
                  </View>
                </View>
              </>
            )}

            {/* Document Upload — shown as action card */}
            {isAutomatedDone && progress.documents !== 'done' && (
              <View style={styles.card}>
                <Text style={styles.cardTitle}>{'📄 Upload Documents'}</Text>
                <Text style={styles.cardDesc}>
                  Upload your MBBS certificate, registration certificate and Aadhaar card
                  for verification.
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
                (logs as VerificationLog[]).map((log) => (
                  <TouchableOpacity
                    key={log.id}
                    style={styles.logItem}
                    onPress={() => setSelectedLog(log)}
                    activeOpacity={0.7}
                  >
                    <View style={styles.logRow}>
                      <Text style={styles.logSource} numberOfLines={1}>
                        {sourceLabel(log.verificationSource ?? log.status)}
                      </Text>
                      <Text style={styles.logDate}>
                        {new Date(log.createdAt).toLocaleDateString('en-IN', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </Text>
                    </View>
                    <Text style={styles.logReg}>Reg: {log.registrationNumber}</Text>
                    {log.rawResponse?.issueLabel && (
                      <Text style={styles.logStatus}>
                        {log.rawResponse.issueLabel === 'Pending Admin Approval'
                          ? '🔒 Awaiting admin review'
                          : `⚠️ ${log.rawResponse.issueLabel}`}
                      </Text>
                    )}
                    <Text style={styles.logHint}>{'Tap to view details →'}</Text>
                  </TouchableOpacity>
                ))
              )}
            </View>
          </View>
        )}

        {/* ════ STEP 3 — Document Upload sub-view ════ */}
        {wizardStep === 3 && showDocumentUpload && (
          <View style={styles.stepBox}>
            <TouchableOpacity
              style={styles.backBtnInline}
              onPress={() => setShowDocumentUpload(false)}
            >
              <Text style={styles.backBtnInlineText}>{'← Back'}</Text>
            </TouchableOpacity>

            <Text style={styles.stepTitle}>Upload Documents</Text>
            <Text style={styles.stepDesc}>
              Upload your verification documents manually, or fetch them automatically
              from DigiLocker.
            </Text>

            {/* DigiLocker option */}
            {progress.documents !== 'done' && (
              <View style={styles.card}>
                <Text style={styles.cardTitle}>{'🔐 Fetch from DigiLocker'}</Text>
                <Text style={styles.cardDesc}>
                  Allow Curex24 to securely fetch your Aadhaar and medical certificate from
                  DigiLocker automatically — no manual upload needed.
                </Text>
                <TouchableOpacity
                  style={[
                    styles.actionBtn,
                    digilockerMutation.isPending && styles.actionBtnDisabled,
                  ]}
                  onPress={handleDigilockerConsent}
                  disabled={digilockerMutation.isPending}
                >
                  {digilockerMutation.isPending ? (
                    <ActivityIndicator color={Colors.white} />
                  ) : (
                    <Text style={styles.actionBtnText}>{'🔐  Connect DigiLocker'}</Text>
                  )}
                </TouchableOpacity>
              </View>
            )}

            {/* OR divider */}
            {progress.documents !== 'done' && (
              <View style={styles.orDivider}>
                <View style={styles.orLine} />
                <Text style={styles.orText}>OR</Text>
                <View style={styles.orLine} />
              </View>
            )}

            {/* Manual upload */}
            {progress.documents !== 'done' && (
              <>
                <Text style={[styles.label, { marginBottom: 12 }]}>Upload Manually</Text>

                {/* Aadhaar picker */}
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

                {/* Submit for verification */}
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
                    <Text style={styles.primaryBtnText}>{'📤  Submit for Verification'}</Text>
                  )}
                </TouchableOpacity>
              </>
            )}

            {progress.documents === 'done' && (
              <View style={[styles.card, styles.doneCard, { marginTop: 16 }]}>
                <Text style={styles.doneCardText}>{'✅  Documents uploaded successfully'}</Text>
                <TouchableOpacity
                  style={[styles.actionBtn, { marginTop: 12 }]}
                  onPress={() => setShowDocumentUpload(false)}
                >
                  <Text style={styles.actionBtnText}>Continue to Face Verification</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        )}

        {/* ── Council Picker Modal ── */}
        <Modal
          visible={showCouncilPicker}
          animationType="slide"
          transparent
          onRequestClose={() => setShowCouncilPicker(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContainer}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Select State Medical Council</Text>
                <TouchableOpacity onPress={() => setShowCouncilPicker(false)}>
                  <Text style={styles.modalClose}>{'✕'}</Text>
                </TouchableOpacity>
              </View>
              <TextInput
                style={styles.searchInput}
                placeholder="Search council..."
                placeholderTextColor={Colors.textMuted}
                value={councilSearch}
                onChangeText={setCouncilSearch}
                autoFocus
              />
              <FlatList
                data={filteredCouncils}
                keyExtractor={(item) => item}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={[
                      styles.councilItem,
                      stateCouncil === item && styles.councilItemSelected,
                    ]}
                    onPress={() => {
                      setStateCouncil(item);
                      setShowCouncilPicker(false);
                    }}
                  >
                    <Text
                      style={[
                        styles.councilItemText,
                        stateCouncil === item && styles.councilItemTextSelected,
                      ]}
                    >
                      {item}
                    </Text>
                    {stateCouncil === item && (
                      <Text style={styles.checkmark}>{'✓'}</Text>
                    )}
                  </TouchableOpacity>
                )}
                style={{ maxHeight: 400 }}
                keyboardShouldPersistTaps="handled"
              />
            </View>
          </View>
        </Modal>

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
                        {selectedLog.rawResponse.issueLabel === 'Pending Admin Approval'
                          ? '🔒 All checks done — waiting for admin approval'
                          : `⚠️ Stuck at: ${selectedLog.rawResponse.issueLabel}`}
                      </Text>
                    </View>
                  )}
                </ScrollView>
              </View>
            </View>
          )}
        </Modal>
      </ScrollView>
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
  pickerBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  pickerPlaceholder: { color: Colors.textMuted, fontSize: 15, flex: 1 },
  pickerValue: { color: Colors.text, fontSize: 15, flex: 1 },
  chevron: { color: Colors.textMuted, fontSize: 12, marginLeft: 8 },

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
  logRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  logSource: { fontSize: 13, fontWeight: '700', color: Colors.text, flex: 1 },
  logDate: { fontSize: 11, color: Colors.textMuted, marginLeft: 8 },
  logReg: { fontSize: 12, color: Colors.textMuted },
  logStatus: { fontSize: 12, color: '#D97706', marginTop: 4, fontWeight: '600' },
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
  searchInput: {
    margin: 12,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    borderRadius: 10,
    padding: 10,
    fontSize: 14,
    color: Colors.text,
    backgroundColor: '#F8FAFC',
  },
  councilItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 13,
    borderBottomWidth: 1,
    borderBottomColor: '#F8FAFC',
  },
  councilItemSelected: { backgroundColor: '#EFF6FF' },
  councilItemText: { flex: 1, fontSize: 14, color: Colors.text },
  councilItemTextSelected: { fontWeight: '700', color: Colors.primary },
  checkmark: { fontSize: 16, color: Colors.primary, fontWeight: '700' },

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

  orDivider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 16,
  },
  orLine: { flex: 1, height: 1, backgroundColor: '#E2E8F0' },
  orText: {
    marginHorizontal: 12,
    fontSize: 13,
    fontWeight: '600',
    color: Colors.textMuted,
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
});
