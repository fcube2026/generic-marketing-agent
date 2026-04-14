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
} from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Colors } from '../../constants/colors';
import { providerService, NmcVerificationPayload } from '../../services/providerService';

type VerificationStatus = 'SUCCESS' | 'NOT_FOUND' | 'ERROR' | 'MANUAL_REVIEW';

const STATUS_CONFIG: Record<VerificationStatus, { color: string; icon: string; message: string }> = {
  SUCCESS: { color: Colors.success, icon: '✅', message: 'Verified successfully!' },
  NOT_FOUND: { color: Colors.warning, icon: '⚠️', message: 'Registration not found in NMC records.' },
  ERROR: { color: Colors.error, icon: '❌', message: 'Verification service error. Please try again.' },
  MANUAL_REVIEW: { color: '#6366F1', icon: '🔍', message: 'Sent for manual review by our team.' },
};

export const KycScreen: React.FC = () => {
  const queryClient = useQueryClient();

  const [nmcRegistrationNumber, setNmcRegistrationNumber] = useState('');
  const [stateCouncil, setStateCouncil] = useState('');
  const [yearOfAdmission, setYearOfAdmission] = useState('');
  const [lastStatus, setLastStatus] = useState<VerificationStatus | null>(null);

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
      queryClient.invalidateQueries({ queryKey: ['verification-logs'] });
      queryClient.invalidateQueries({ queryKey: ['provider-profile'] });
      const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG.ERROR;
      Alert.alert(`${cfg.icon} Verification Result`, cfg.message);
    },
    onError: () => {
      setLastStatus('ERROR');
      Alert.alert('❌ Error', 'Failed to submit verification request. Please try again.');
    },
  });

  const handleSubmit = () => {
    if (!nmcRegistrationNumber.trim() || !stateCouncil.trim() || !yearOfAdmission.trim()) {
      Alert.alert('Missing Fields', 'Please fill in all fields before submitting.');
      return;
    }
    if (!/^\d{4}$/.test(yearOfAdmission.trim())) {
      Alert.alert('Invalid Year', 'Year of admission must be a 4-digit year (e.g. 2005).');
      return;
    }
    mutation.mutate({
      nmcRegistrationNumber: nmcRegistrationNumber.trim(),
      stateCouncil: stateCouncil.trim(),
      yearOfAdmission: yearOfAdmission.trim(),
    });
  };

  const isVerified = profile?.isVerified ?? false;
  const bannerStatus = lastStatus ?? (isVerified ? 'SUCCESS' : null);
  const bannerCfg = bannerStatus ? STATUS_CONFIG[bannerStatus] : null;

  return (
    <ScrollView style={styles.container} keyboardShouldPersistTaps="handled">
      <View style={styles.header}>
        <Text style={styles.headerTitle}>KYC & Verification</Text>
        <Text style={styles.headerSub}>Verify your NMC medical registration</Text>
      </View>

      {/* Status banner */}
      {bannerCfg && (
        <View style={[styles.statusBanner, { backgroundColor: bannerCfg.color }]}>
          <Text style={styles.statusText}>
            {bannerCfg.icon} {isVerified && !lastStatus ? '✅ Account Verified' : bannerCfg.message}
          </Text>
        </View>
      )}

      {/* Form */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>NMC Registration Details</Text>

        <Text style={styles.label}>NMC Registration Number</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g. MH-12345"
          placeholderTextColor={Colors.textMuted}
          value={nmcRegistrationNumber}
          onChangeText={setNmcRegistrationNumber}
          autoCapitalize="characters"
        />

        <Text style={styles.label}>State Medical Council</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g. Maharashtra Medical Council"
          placeholderTextColor={Colors.textMuted}
          value={stateCouncil}
          onChangeText={setStateCouncil}
        />

        <Text style={styles.label}>Year of Admission</Text>
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
        ) : logs.length === 0 ? (
          <Text style={styles.noLogsText}>No verification attempts yet.</Text>
        ) : (
          logs.map((log: any) => {
            const cfg = STATUS_CONFIG[log.status as VerificationStatus] ?? STATUS_CONFIG.ERROR;
            return (
              <View key={log.id} style={[styles.logItem, { borderLeftColor: cfg.color }]}>
                <Text style={styles.logStatus}>
                  {cfg.icon} {log.status}
                </Text>
                <Text style={styles.logDetail}>Reg: {log.registrationNumber}</Text>
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
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { backgroundColor: Colors.primary, padding: 20, paddingTop: 60 },
  headerTitle: { fontSize: 22, fontWeight: '800', color: Colors.white },
  headerSub: { fontSize: 13, color: 'rgba(255,255,255,0.75)', marginTop: 4 },
  statusBanner: { margin: 16, borderRadius: 10, padding: 14, alignItems: 'center' },
  statusText: { fontSize: 15, fontWeight: '700', color: Colors.white },
  section: {
    backgroundColor: Colors.white,
    margin: 16,
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
  submitBtn: {
    backgroundColor: Colors.primary,
    marginHorizontal: 16,
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
    marginBottom: 8,
    borderLeftWidth: 4,
    elevation: 1,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 },
  },
  logStatus: { fontSize: 14, fontWeight: '700', color: Colors.text },
  logDetail: { fontSize: 12, color: Colors.textMuted, marginTop: 2 },
  logDate: { fontSize: 11, color: Colors.textMuted, marginTop: 4 },
});
