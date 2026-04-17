import React, { useState } from 'react';
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
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { Colors } from '../../constants/colors';
import { providerService, NmcVerificationPayload } from '../../services/providerService';
import { INDIAN_STATE_COUNCILS } from '../../constants/stateCouncils';

type VerificationStatus = 'SUCCESS' | 'APPROVED' | 'NOT_FOUND' | 'ERROR' | 'MANUAL_REVIEW' | 'INCOMPLETE';

interface VerificationLog {
  id: string;
  status: VerificationStatus;
  registrationNumber: string;
  createdAt: string;
  rawResponse?: {
    issueCode?: number;
    issueLabel?: string;
    confidenceScore?: number;
    steps?: Array<{
      source: string;
      found: boolean;
      score: number;
      details: Record<string, unknown>;
    }>;
  };
}

const STATUS_CONFIG: Record<VerificationStatus, { color: string; icon: string; message: string }> = {
  SUCCESS: { color: Colors.success, icon: '✅', message: 'Verified successfully!' },
  APPROVED: { color: Colors.success, icon: '✅', message: 'Already verified. Your registration is active.' },
  NOT_FOUND: { color: Colors.warning, icon: '⚠️', message: 'Registration not found in records.' },
  ERROR: { color: Colors.error, icon: '❌', message: 'Verification service error. Please try again.' },
  MANUAL_REVIEW: { color: '#6366F1', icon: '🔍', message: 'Sent for manual review by our team.' },
  INCOMPLETE: { color: Colors.textMuted, icon: '📝', message: 'Please complete all required fields.' },
};

const ISSUE_CODE_COLORS: Record<number, string> = {
  100: Colors.success,
  200: '#10B981',
  300: Colors.warning,
  400: Colors.error,
  500: '#6366F1',
  600: Colors.error,
  700: Colors.textMuted,
};

export const KycScreen: React.FC = () => {
  const queryClient = useQueryClient();

  const [fullName, setFullName] = useState('');
  const [fatherName, setFatherName] = useState('');
  const [nmcRegistrationNumber, setNmcRegistrationNumber] = useState('');
  const [stateCouncil, setStateCouncil] = useState('');
  const [yearOfAdmission, setYearOfAdmission] = useState('');
  const [lastStatus, setLastStatus] = useState<VerificationStatus | null>(null);
  const [lastIssueCode, setLastIssueCode] = useState<number | null>(null);
  const [lastConfidenceScore, setLastConfidenceScore] = useState<number | null>(null);
  const [showCouncilPicker, setShowCouncilPicker] = useState(false);
  const [councilSearch, setCouncilSearch] = useState('');

  const { data: profile } = useQuery({
    queryKey: ['provider-profile'],
    queryFn: providerService.getProfile,
  });

  const { data: logs = [], isLoading: logsLoading } = useQuery({
    queryKey: ['verification-logs'],
    queryFn: providerService.getVerificationLogs,
  });

  const mutation = useMutation({
    mutationFn: (payload: NmcVerificationPayload) =>
      providerService.submitNmcVerification(payload),
    onSuccess: (data) => {
      const status: VerificationStatus = data?.status ?? 'ERROR';
      setLastStatus(status);
      setLastIssueCode(data?.issueCode ?? null);
      setLastConfidenceScore(data?.confidenceScore ?? null);
      queryClient.invalidateQueries({ queryKey: ['verification-logs'] });
      queryClient.invalidateQueries({ queryKey: ['provider-profile'] });
      const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG.ERROR;
      const issueLabel = data?.issueLabel ? `\nStatus: ${data.issueLabel}` : '';
      const scoreMsg = data?.confidenceScore != null ? `\nConfidence: ${data.confidenceScore}%` : '';
      Alert.alert(`${cfg.icon} Verification Result`, `${cfg.message}${issueLabel}${scoreMsg}`);
    },
    onError: (error: unknown) => {
      setLastStatus('ERROR');
      const httpStatus = axios.isAxiosError(error) ? error.response?.status : undefined;
      if (httpStatus === 404) {
        Alert.alert('❌ Profile Not Found', 'Please complete your provider profile before submitting for verification.');
      } else if (httpStatus === 401) {
        Alert.alert('❌ Session Expired', 'Your session has expired. Please log in again.');
      } else {
        Alert.alert('❌ Error', 'Failed to submit verification request. Please try again.');
      }
    },
  });

  const handleSubmit = () => {
    if (!fullName.trim()) {
      Alert.alert('Missing Field', 'Please enter your full name.');
      return;
    }
    if (!nmcRegistrationNumber.trim()) {
      Alert.alert('Missing Field', 'Please enter your NMC registration number.');
      return;
    }
    if (!stateCouncil) {
      Alert.alert('Missing Field', 'Please select your State Medical Council.');
      return;
    }
    if (!yearOfAdmission.trim()) {
      Alert.alert('Missing Field', 'Please enter your year of admission.');
      return;
    }
    if (!/^\d{4}$/.test(yearOfAdmission.trim())) {
      Alert.alert('Invalid Year', 'Year of admission must be a 4-digit year (e.g. 2005).');
      return;
    }
    mutation.mutate({
      fullName: fullName.trim(),
      fatherName: fatherName.trim() || undefined,
      nmcRegistrationNumber: nmcRegistrationNumber.trim(),
      stateCouncil,
      yearOfAdmission: yearOfAdmission.trim(),
    });
  };

  const filteredCouncils = INDIAN_STATE_COUNCILS.filter((c) =>
    c.toLowerCase().includes(councilSearch.toLowerCase()),
  );

  const isVerified = profile?.isVerified ?? false;
  const bannerStatus = lastStatus ?? (isVerified ? 'SUCCESS' : null);
  const bannerCfg = bannerStatus ? STATUS_CONFIG[bannerStatus] : null;

  return (
    <ScrollView style={styles.container} keyboardShouldPersistTaps="handled">
      <View style={styles.header}>
        <Text style={styles.headerTitle}>KYC & Verification</Text>
        <Text style={styles.headerSub}>Verify your medical registration with India's councils</Text>
      </View>

      {/* Status banner */}
      {bannerCfg && (
        <View style={[styles.statusBanner, { backgroundColor: bannerCfg.color }]}>
          <Text style={styles.statusText}>
            {isVerified && !lastStatus ? '✅ Account Verified' : `${bannerCfg.icon} ${bannerCfg.message}`}
          </Text>
          {lastIssueCode != null && (
            <View style={[styles.issueCodeBadge, { backgroundColor: ISSUE_CODE_COLORS[lastIssueCode] ?? '#6B7280' }]}>
              <Text style={styles.issueCodeText}>Code {lastIssueCode}</Text>
            </View>
          )}
          {lastConfidenceScore != null && (
            <Text style={styles.confidenceText}>Confidence: {lastConfidenceScore}%</Text>
          )}
        </View>
      )}

      {/* Form */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Doctor Details</Text>

        <Text style={styles.label}>
          Full Name <Text style={styles.required}>*</Text>
        </Text>
        <TextInput
          style={styles.input}
          placeholder="e.g. Dr. Priya Sharma"
          placeholderTextColor={Colors.textMuted}
          value={fullName}
          onChangeText={setFullName}
          autoCapitalize="words"
        />

        <Text style={styles.label}>Father's Name <Text style={styles.optional}>(optional)</Text></Text>
        <TextInput
          style={styles.input}
          placeholder="e.g. Rajesh Sharma"
          placeholderTextColor={Colors.textMuted}
          value={fatherName}
          onChangeText={setFatherName}
          autoCapitalize="words"
        />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>NMC Registration Details</Text>

        <Text style={styles.label}>
          NMC Registration Number <Text style={styles.required}>*</Text>
        </Text>
        <TextInput
          style={styles.input}
          placeholder="e.g. MH-12345"
          placeholderTextColor={Colors.textMuted}
          value={nmcRegistrationNumber}
          onChangeText={setNmcRegistrationNumber}
          autoCapitalize="characters"
        />

        <Text style={styles.label}>
          State Medical Council <Text style={styles.required}>*</Text>
        </Text>
        <TouchableOpacity
          style={[styles.input, styles.pickerBtn]}
          onPress={() => { setCouncilSearch(''); setShowCouncilPicker(true); }}
        >
          <Text style={stateCouncil ? styles.pickerValueText : styles.pickerPlaceholder}>
            {stateCouncil || 'Select your State Medical Council'}
          </Text>
          <Text style={styles.pickerChevron}>▼</Text>
        </TouchableOpacity>

        <Text style={styles.label}>
          Year of Admission <Text style={styles.required}>*</Text>
        </Text>
        <TextInput
          style={styles.input}
          placeholder="e.g. 2005"
          placeholderTextColor={Colors.textMuted}
          value={yearOfAdmission}
          onChangeText={setYearOfAdmission}
          keyboardType="number-pad"
          maxLength={4}
        />
      </View>

      {/* Verification steps info */}
      <View style={styles.stepsCard}>
        <Text style={styles.stepsTitle}>🔒 Verification Pipeline</Text>
        <Text style={styles.stepsSubtitle}>Your registration will be checked through:</Text>
        {[
          { icon: '1️⃣', label: 'NMC / Surepass API check', weight: '35 pts' },
          { icon: '2️⃣', label: 'State Medical Council portal', weight: '30 pts' },
          { icon: '3️⃣', label: 'DigiLocker documents', weight: '15 pts' },
          { icon: '4️⃣', label: 'OCR document parsing', weight: '10 pts' },
          { icon: '5️⃣', label: 'Face verification', weight: '10 pts' },
        ].map((step) => (
          <View key={step.label} style={styles.stepRow}>
            <Text style={styles.stepIcon}>{step.icon}</Text>
            <Text style={styles.stepLabel}>{step.label}</Text>
            <Text style={styles.stepWeight}>{step.weight}</Text>
          </View>
        ))}
      </View>

      <TouchableOpacity
        style={[styles.submitBtn, mutation.isPending && styles.submitBtnDisabled]}
        onPress={handleSubmit}
        disabled={mutation.isPending}
      >
        {mutation.isPending ? (
          <ActivityIndicator color={Colors.white} />
        ) : (
          <Text style={styles.submitBtnText}>Submit for Verification</Text>
        )}
      </TouchableOpacity>

      {/* Verification history */}
      <View style={styles.logsSection}>
        <Text style={styles.logsSectionTitle}>Verification History</Text>
        {logsLoading ? (
          <ActivityIndicator color={Colors.primary} style={{ marginTop: 12 }} />
        ) : (logs as VerificationLog[]).length === 0 ? (
          <Text style={styles.noLogsText}>No verification attempts yet.</Text>
        ) : (
          (logs as VerificationLog[]).map((log) => {
            const cfg = STATUS_CONFIG[log.status as VerificationStatus] ?? STATUS_CONFIG.ERROR;
            const issueCode = log.rawResponse?.issueCode;
            const score = log.rawResponse?.confidenceScore;
            const steps = log.rawResponse?.steps ?? [];
            return (
              <View key={log.id} style={[styles.logItem, { borderLeftColor: cfg.color }]}>
                <View style={styles.logHeader}>
                  <Text style={styles.logStatus}>
                    {cfg.icon} {log.status}
                  </Text>
                  {issueCode != null && (
                    <View style={[styles.issueCodeSmall, { backgroundColor: ISSUE_CODE_COLORS[issueCode] ?? '#6B7280' }]}>
                      <Text style={styles.issueCodeSmallText}>Code {issueCode}</Text>
                    </View>
                  )}
                </View>
                <Text style={styles.logDetail}>Reg: {log.registrationNumber}</Text>
                {log.rawResponse?.issueLabel && (
                  <Text style={styles.logIssueLabel}>{log.rawResponse.issueLabel}</Text>
                )}
                {score != null && (
                  <View style={styles.scoreBar}>
                    <View style={[styles.scoreBarFill, { width: `${score}%`, backgroundColor: score >= 90 ? Colors.success : score >= 50 ? Colors.warning : Colors.error }]} />
                    <Text style={styles.scoreBarText}>{score}% confidence</Text>
                  </View>
                )}
                {steps.length > 0 && (
                  <View style={styles.stepsBreakdown}>
                    {steps.map((s) => (
                      <Text key={s.source} style={styles.stepBreakdownText}>
                        {s.found ? '✅' : '❌'} {s.source.replace(/_/g, ' ')} (+{s.score})
                      </Text>
                    ))}
                  </View>
                )}
                <Text style={styles.logDate}>
                  {new Date(log.createdAt).toLocaleDateString('en-IN', {
                    day: '2-digit',
                    month: 'short',
                    year: 'numeric',
                  })}
                </Text>
              </View>
            );
          })
        )}
      </View>

      <View style={{ height: 40 }} />

      {/* State Council Picker Modal */}
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
                <Text style={styles.modalClose}>✕</Text>
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
                  style={[styles.councilOption, stateCouncil === item && styles.councilOptionSelected]}
                  onPress={() => { setStateCouncil(item); setShowCouncilPicker(false); }}
                >
                  <Text style={[styles.councilOptionText, stateCouncil === item && styles.councilOptionTextSelected]}>
                    {item}
                  </Text>
                  {stateCouncil === item && <Text style={styles.checkmark}>✓</Text>}
                </TouchableOpacity>
              )}
              style={styles.councilList}
              keyboardShouldPersistTaps="handled"
            />
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { backgroundColor: Colors.primary, padding: 20, paddingTop: 24 },
  headerTitle: { fontSize: 22, fontWeight: '800', color: Colors.white },
  headerSub: { fontSize: 13, color: 'rgba(255,255,255,0.75)', marginTop: 4 },
  statusBanner: { margin: 16, borderRadius: 10, padding: 14, alignItems: 'center', gap: 6 },
  statusText: { fontSize: 15, fontWeight: '700', color: Colors.white, textAlign: 'center' },
  issueCodeBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  issueCodeText: { fontSize: 12, fontWeight: '700', color: Colors.white },
  confidenceText: { fontSize: 13, color: 'rgba(255,255,255,0.9)', fontWeight: '600' },
  section: {
    backgroundColor: Colors.white,
    margin: 16,
    marginBottom: 0,
    borderRadius: 12,
    padding: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
  },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: Colors.text, marginBottom: 16 },
  label: { fontSize: 13, fontWeight: '600', color: Colors.text, marginBottom: 6 },
  required: { color: Colors.error, fontWeight: '700' },
  optional: { color: Colors.textMuted, fontWeight: '400', fontSize: 12 },
  input: {
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    borderRadius: 10,
    padding: 12,
    fontSize: 15,
    color: Colors.text,
    backgroundColor: '#F8FAFC',
    marginBottom: 14,
  },
  pickerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  pickerPlaceholder: { color: Colors.textMuted, fontSize: 15, flex: 1 },
  pickerValueText: { color: Colors.text, fontSize: 15, flex: 1 },
  pickerChevron: { color: Colors.textMuted, fontSize: 12, marginLeft: 8 },
  stepsCard: {
    backgroundColor: '#EFF6FF',
    margin: 16,
    marginTop: 12,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#DBEAFE',
  },
  stepsTitle: { fontSize: 14, fontWeight: '700', color: '#1E40AF', marginBottom: 4 },
  stepsSubtitle: { fontSize: 12, color: '#3B82F6', marginBottom: 10 },
  stepRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  stepIcon: { fontSize: 14, width: 28 },
  stepLabel: { flex: 1, fontSize: 13, color: '#1E3A5F' },
  stepWeight: { fontSize: 12, fontWeight: '700', color: '#1E40AF' },
  submitBtn: {
    backgroundColor: Colors.primary,
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  submitBtnDisabled: { backgroundColor: Colors.textMuted },
  submitBtnText: { fontSize: 16, fontWeight: '700', color: Colors.white },
  logsSection: { margin: 16, marginTop: 24 },
  logsSectionTitle: { fontSize: 15, fontWeight: '700', color: Colors.text, marginBottom: 12 },
  noLogsText: { fontSize: 13, color: Colors.textMuted, textAlign: 'center', marginTop: 8 },
  logItem: {
    backgroundColor: Colors.white,
    borderRadius: 10,
    padding: 12,
    marginBottom: 10,
    borderLeftWidth: 4,
    elevation: 1,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 },
  },
  logHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  logStatus: { fontSize: 14, fontWeight: '700', color: Colors.text, flex: 1 },
  issueCodeSmall: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10 },
  issueCodeSmallText: { fontSize: 11, fontWeight: '700', color: Colors.white },
  logDetail: { fontSize: 12, color: Colors.textMuted, marginTop: 2 },
  logIssueLabel: { fontSize: 12, color: Colors.text, marginTop: 3, fontStyle: 'italic' },
  scoreBar: {
    height: 18,
    backgroundColor: '#F1F5F9',
    borderRadius: 9,
    marginTop: 8,
    overflow: 'hidden',
    justifyContent: 'center',
  },
  scoreBarFill: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    borderRadius: 9,
    opacity: 0.7,
  },
  scoreBarText: {
    fontSize: 10,
    fontWeight: '700',
    color: Colors.text,
    textAlign: 'center',
    zIndex: 1,
  },
  stepsBreakdown: { marginTop: 6 },
  stepBreakdownText: { fontSize: 11, color: Colors.textMuted, marginTop: 2 },
  logDate: { fontSize: 11, color: Colors.textMuted, marginTop: 6 },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
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
  councilList: { maxHeight: 400 },
  councilOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 13,
    borderBottomWidth: 1,
    borderBottomColor: '#F8FAFC',
  },
  councilOptionSelected: { backgroundColor: '#EFF6FF' },
  councilOptionText: { flex: 1, fontSize: 14, color: Colors.text },
  councilOptionTextSelected: { fontWeight: '700', color: Colors.primary },
  checkmark: { fontSize: 16, color: Colors.primary, fontWeight: '700' },
});
