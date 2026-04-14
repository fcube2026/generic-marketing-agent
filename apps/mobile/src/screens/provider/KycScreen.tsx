import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Colors } from '../../constants/colors';
import { Input } from '../../components/common/Input';
import { Button } from '../../components/common/Button';
import { providerService } from '../../services/providerService';

type VerificationStatus = 'SUCCESS' | 'NOT_FOUND' | 'ERROR' | 'MANUAL_REVIEW';

const STATUS_LABEL: Record<VerificationStatus, string> = {
  SUCCESS: '✅ Verified',
  NOT_FOUND: '❌ Not Found in NMC Records',
  ERROR: '⚠️ Verification Error',
  MANUAL_REVIEW: '🔍 Under Manual Review',
};

const STATUS_COLOR: Record<VerificationStatus, string> = {
  SUCCESS: Colors.success,
  NOT_FOUND: Colors.error,
  ERROR: Colors.warning,
  MANUAL_REVIEW: Colors.warning,
};

export const KycScreen: React.FC = () => {
  const queryClient = useQueryClient();

  const [form, setForm] = useState({
    nmcRegistrationNumber: '',
    stateCouncil: '',
    yearOfAdmission: '',
  });
  const [lastResult, setLastResult] = useState<{
    status: VerificationStatus;
    cached?: boolean;
  } | null>(null);

  const { data: profile } = useQuery({
    queryKey: ['provider-profile'],
    queryFn: providerService.getProfile,
  });

  const { data: logs, isLoading: logsLoading } = useQuery({
    queryKey: ['verification-logs'],
    queryFn: providerService.getVerificationLogs,
  });

  const mutation = useMutation({
    mutationFn: providerService.submitNmcVerification,
    onSuccess: (data) => {
      setLastResult(data);
      queryClient.invalidateQueries({ queryKey: ['provider-profile'] });
      queryClient.invalidateQueries({ queryKey: ['verification-logs'] });

      if (data.status === 'SUCCESS') {
        Alert.alert(
          '✅ Verified!',
          'Your NMC registration has been verified. You can now accept bookings.',
        );
      } else if (data.status === 'NOT_FOUND') {
        Alert.alert(
          'Not Found',
          'Your registration number was not found in NMC records. Please check the details and try again.',
        );
      } else if (data.status === 'MANUAL_REVIEW') {
        Alert.alert(
          'Under Review',
          'Your registration has been sent for manual review. You will be notified once verified.',
        );
      } else {
        Alert.alert(
          'Error',
          'An error occurred during verification. Please try again later.',
        );
      }
    },
    onError: (e: any) => {
      Alert.alert(
        'Submission Failed',
        e?.response?.data?.message || e?.response?.data?.error || 'Could not submit verification. Check your connection and try again.',
      );
    },
  });

  const handleSubmit = () => {
    const { nmcRegistrationNumber, stateCouncil, yearOfAdmission } = form;
    if (!nmcRegistrationNumber.trim()) {
      Alert.alert('Required', 'Please enter your NMC registration number.'); return;
    }
    if (!stateCouncil.trim()) {
      Alert.alert('Required', 'Please enter your state medical council.'); return;
    }
    if (!/^\d{4}$/.test(yearOfAdmission.trim())) {
      Alert.alert('Invalid', 'Year of admission must be a 4-digit year (e.g. 2015).'); return;
    }
    mutation.mutate({
      nmcRegistrationNumber: nmcRegistrationNumber.trim(),
      stateCouncil: stateCouncil.trim(),
      yearOfAdmission: yearOfAdmission.trim(),
    });
  };

  const isVerified = profile?.isVerified;

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>NMC Verification</Text>
        <Text style={styles.headerSub}>
          Submit your National Medical Council registration details for automated verification.
        </Text>
      </View>

      {/* Current status banner */}
      <View style={[styles.statusBanner, { backgroundColor: isVerified ? Colors.success : Colors.warning }]}>
        <Text style={styles.statusText}>
          {isVerified ? '✅ Your profile is verified' : '⏳ Verification pending'}
        </Text>
      </View>

      {/* Last result (shown after submit) */}
      {lastResult && !lastResult.cached && (
        <View style={[styles.resultBanner, { borderColor: STATUS_COLOR[lastResult.status] }]}>
          <Text style={[styles.resultText, { color: STATUS_COLOR[lastResult.status] }]}>
            {STATUS_LABEL[lastResult.status]}
          </Text>
        </View>
      )}

      {/* NMC Form */}
      <View style={styles.formCard}>
        <Text style={styles.formTitle}>Registration Details</Text>

        <Input
          label="NMC Registration Number *"
          value={form.nmcRegistrationNumber}
          onChangeText={(t) => setForm((f) => ({ ...f, nmcRegistrationNumber: t }))}
          placeholder="e.g. MH-12345"
          autoCapitalize="characters"
        />
        <Input
          label="State Medical Council *"
          value={form.stateCouncil}
          onChangeText={(t) => setForm((f) => ({ ...f, stateCouncil: t }))}
          placeholder="e.g. Maharashtra Medical Council"
        />
        <Input
          label="Year of Admission *"
          value={form.yearOfAdmission}
          onChangeText={(t) => setForm((f) => ({ ...f, yearOfAdmission: t.replace(/\D/g, '').slice(0, 4) }))}
          placeholder="e.g. 2015"
          keyboardType="numeric"
          maxLength={4}
        />

        <Button
          title={mutation.isPending ? 'Verifying…' : 'Submit for Verification'}
          onPress={handleSubmit}
          loading={mutation.isPending}
          disabled={mutation.isPending}
        />
      </View>

      {/* Verification log */}
      <View style={styles.logsSection}>
        <Text style={styles.logsTitle}>Verification History</Text>
        {logsLoading ? (
          <ActivityIndicator color={Colors.primary} style={{ marginVertical: 16 }} />
        ) : !logs || logs.length === 0 ? (
          <Text style={styles.noLogs}>No verification attempts yet.</Text>
        ) : (
          logs.map((log: any) => (
            <View key={log.id} style={styles.logItem}>
              <View style={styles.logTop}>
                <Text style={[styles.logStatus, { color: STATUS_COLOR[log.status as VerificationStatus] ?? Colors.text }]}>
                  {STATUS_LABEL[log.status as VerificationStatus] ?? log.status}
                </Text>
                <Text style={styles.logDate}>
                  {new Date(log.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                </Text>
              </View>
              <Text style={styles.logReg}>{log.registrationNumber} · {log.stateCouncil}</Text>
              {log.errorCode && (
                <Text style={styles.logError}>Code: {log.errorCode}</Text>
              )}
            </View>
          ))
        )}
      </View>

      <TouchableOpacity
        style={styles.refreshBtn}
        onPress={() => {
          queryClient.invalidateQueries({ queryKey: ['verification-logs'] });
          queryClient.invalidateQueries({ queryKey: ['provider-profile'] });
        }}
      >
        <Text style={styles.refreshBtnText}>↻ Refresh Status</Text>
      </TouchableOpacity>

      <View style={{ height: 40 }} />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { backgroundColor: Colors.primary, padding: 20, paddingTop: 24 },
  headerTitle: { fontSize: 22, fontWeight: '800', color: Colors.white },
  headerSub: { fontSize: 13, color: 'rgba(255,255,255,0.8)', marginTop: 4, lineHeight: 18 },
  statusBanner: { margin: 16, borderRadius: 10, padding: 14, alignItems: 'center' },
  statusText: { fontSize: 15, fontWeight: '700', color: Colors.white },
  resultBanner: {
    marginHorizontal: 16,
    marginBottom: 4,
    borderRadius: 10,
    borderWidth: 2,
    padding: 12,
    alignItems: 'center',
    backgroundColor: Colors.white,
  },
  resultText: { fontSize: 15, fontWeight: '700' },
  formCard: {
    backgroundColor: Colors.white,
    margin: 16,
    borderRadius: 14,
    padding: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
  },
  formTitle: { fontSize: 17, fontWeight: '700', color: Colors.text, marginBottom: 14 },
  logsSection: { margin: 16, marginTop: 8 },
  logsTitle: { fontSize: 16, fontWeight: '700', color: Colors.text, marginBottom: 10 },
  noLogs: { fontSize: 14, color: Colors.textMuted, textAlign: 'center', paddingVertical: 12 },
  logItem: {
    backgroundColor: Colors.white,
    borderRadius: 10,
    padding: 12,
    marginBottom: 8,
    elevation: 1,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 1 },
  },
  logTop: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  logStatus: { fontSize: 13, fontWeight: '700' },
  logDate: { fontSize: 12, color: Colors.textMuted },
  logReg: { fontSize: 13, color: Colors.textMuted },
  logError: { fontSize: 12, color: Colors.error, marginTop: 2 },
  refreshBtn: {
    alignSelf: 'center',
    paddingVertical: 10,
    paddingHorizontal: 24,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: Colors.primary,
  },
  refreshBtnText: { fontSize: 14, fontWeight: '600', color: Colors.primary },
});
