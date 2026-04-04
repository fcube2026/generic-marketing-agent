import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { Colors } from '../../constants/colors';

export const KycScreen: React.FC = () => {
  const [licenseFile, setLicenseFile] = useState<string | null>(null);
  const [govIdFile, setGovIdFile] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [status] = useState<'PENDING' | 'VERIFIED' | 'REJECTED'>('PENDING');

  const mockUpload = (type: string, setter: (v: string) => void) => {
    Alert.alert('Upload Document', `Select ${type}`, [
      { text: 'Camera', onPress: () => setter(`${type}_photo_${Date.now()}.jpg`) },
      { text: 'Gallery', onPress: () => setter(`${type}_image_${Date.now()}.jpg`) },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  const handleSubmit = () => {
    if (!licenseFile || !govIdFile) {
      Alert.alert('Missing Documents', 'Please upload both documents before submitting.');
      return;
    }
    Alert.alert('Submitted', 'Your documents have been submitted for verification.', [
      { text: 'OK', onPress: () => setSubmitted(true) },
    ]);
  };

  const statusColors: Record<string, string> = { PENDING: Colors.warning, VERIFIED: Colors.success, REJECTED: Colors.error };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>KYC & Verification</Text>
      </View>

      <View style={[styles.statusBanner, { backgroundColor: statusColors[status] }]}>
        <Text style={styles.statusText}>
          {status === 'PENDING' ? '⏳ Verification Pending' : status === 'VERIFIED' ? '✅ Verified' : '❌ Rejected – Please re-upload'}
        </Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Medical License / Certification</Text>
        <Text style={styles.sectionSub}>Upload your medical degree or professional certification</Text>
        <TouchableOpacity style={styles.uploadBtn} onPress={() => mockUpload('Medical License', setLicenseFile)}>
          <Text style={styles.uploadBtnText}>📎 Choose File</Text>
        </TouchableOpacity>
        {licenseFile && <Text style={styles.fileName}>✓ {licenseFile}</Text>}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Government ID Proof</Text>
        <Text style={styles.sectionSub}>Aadhaar, Passport, or Voter ID</Text>
        <TouchableOpacity style={styles.uploadBtn} onPress={() => mockUpload('Government ID', setGovIdFile)}>
          <Text style={styles.uploadBtnText}>📎 Choose File</Text>
        </TouchableOpacity>
        {govIdFile && <Text style={styles.fileName}>✓ {govIdFile}</Text>}
      </View>

      <TouchableOpacity
        style={[styles.submitBtn, submitted && styles.submitBtnDisabled]}
        onPress={handleSubmit}
        disabled={submitted}
      >
        <Text style={styles.submitBtnText}>{submitted ? 'Documents Submitted' : 'Submit for Verification'}</Text>
      </TouchableOpacity>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { backgroundColor: Colors.primary, padding: 20, paddingTop: 60 },
  headerTitle: { fontSize: 22, fontWeight: '800', color: Colors.white },
  statusBanner: { margin: 16, borderRadius: 10, padding: 14, alignItems: 'center' },
  statusText: { fontSize: 15, fontWeight: '700', color: Colors.white },
  section: { backgroundColor: Colors.white, margin: 16, marginBottom: 0, borderRadius: 12, padding: 16, elevation: 2 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: Colors.text, marginBottom: 4 },
  sectionSub: { fontSize: 13, color: Colors.textMuted, marginBottom: 12 },
  uploadBtn: { borderWidth: 2, borderColor: Colors.primary, borderStyle: 'dashed', borderRadius: 10, padding: 16, alignItems: 'center' },
  uploadBtnText: { fontSize: 15, fontWeight: '600', color: Colors.primary },
  fileName: { marginTop: 10, fontSize: 13, color: Colors.success, fontWeight: '600' },
  submitBtn: { backgroundColor: Colors.primary, margin: 16, borderRadius: 12, padding: 16, alignItems: 'center' },
  submitBtnDisabled: { backgroundColor: Colors.textMuted },
  submitBtnText: { fontSize: 16, fontWeight: '700', color: Colors.white },
});
