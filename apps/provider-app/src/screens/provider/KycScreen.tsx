import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { Colors } from '../../constants/colors';
import { providerService } from '../../services/providerService';

interface KycDocument {
  id: string;
  type: string;
  documentUrl: string;
  status: string;
  rejectionReason?: string | null;
  expiresAt?: string | null;
  verifiedAt?: string | null;
  createdAt: string;
}

export const KycScreen: React.FC = () => {
  const [documents, setDocuments] = useState<KycDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchDocuments = useCallback(async () => {
    try {
      setError(null);
      const data = await providerService.getKycDocuments();
      setDocuments(data);
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to load documents');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDocuments();
  }, [fetchDocuments]);

  const handleUpload = (type: string) => {
    Alert.alert('Upload Document', `Select ${type}`, [
      {
        text: 'Camera',
        onPress: () => submitDocument(type, `https://storage.curex24.com/kyc/${type.replace(/\s+/g, '_').toLowerCase()}_photo_${Date.now()}.jpg`),
      },
      {
        text: 'Gallery',
        onPress: () => submitDocument(type, `https://storage.curex24.com/kyc/${type.replace(/\s+/g, '_').toLowerCase()}_image_${Date.now()}.jpg`),
      },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  const submitDocument = async (type: string, documentUrl: string) => {
    try {
      setUploading(true);
      setError(null);
      await providerService.uploadKycDocument({ type, documentUrl });
      await fetchDocuments();
      Alert.alert('Success', 'Document uploaded successfully and is pending verification.');
    } catch (err: any) {
      const message = err?.response?.data?.message || 'Failed to upload document. Please try again.';
      setError(message);
      Alert.alert('Upload Failed', message);
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = (doc: KycDocument) => {
    Alert.alert(
      'Delete Document',
      `Are you sure you want to delete this ${doc.type} document?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              setError(null);
              await providerService.deleteKycDocument(doc.id);
              await fetchDocuments();
            } catch (err: any) {
              const message = err?.response?.data?.message || 'Failed to delete document';
              setError(message);
              Alert.alert('Error', message);
            }
          },
        },
      ],
    );
  };

  const getDocByType = (type: string) => documents.find((d) => d.type === type);
  const licenseDoc = getDocByType('Medical License');
  const govIdDoc = getDocByType('Government ID');

  const overallStatus = documents.length === 0
    ? 'NO_DOCUMENTS'
    : documents.every((d) => d.status === 'APPROVED')
      ? 'VERIFIED'
      : documents.some((d) => d.status === 'REJECTED')
        ? 'REJECTED'
        : 'PENDING';

  const statusConfig: Record<string, { color: string; text: string }> = {
    NO_DOCUMENTS: { color: Colors.textMuted, text: '📄 Upload your documents to get verified' },
    PENDING: { color: Colors.warning, text: '⏳ Verification Pending' },
    VERIFIED: { color: Colors.success, text: '✅ Verified' },
    REJECTED: { color: Colors.error, text: '❌ Rejected – Please re-upload' },
  };

  const docStatusColors: Record<string, string> = {
    PENDING: Colors.warning,
    APPROVED: Colors.success,
    REJECTED: Colors.error,
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
        <Text style={styles.loadingText}>Loading documents...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>KYC & Verification</Text>
      </View>

      <View style={[styles.statusBanner, { backgroundColor: statusConfig[overallStatus].color }]}>
        <Text style={styles.statusText}>{statusConfig[overallStatus].text}</Text>
      </View>

      {error && (
        <View style={styles.errorBanner}>
          <Text style={styles.errorText}>⚠️ {error}</Text>
        </View>
      )}

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Medical License / Certification</Text>
        <Text style={styles.sectionSub}>Upload your medical degree or professional certification</Text>
        {licenseDoc ? (
          <View style={styles.documentCard}>
            <View style={styles.documentInfo}>
              <Text style={styles.fileName}>✓ {licenseDoc.type}</Text>
              <View style={[styles.statusBadge, { backgroundColor: docStatusColors[licenseDoc.status] }]}>
                <Text style={styles.statusBadgeText}>{licenseDoc.status}</Text>
              </View>
            </View>
            {licenseDoc.status === 'REJECTED' && licenseDoc.rejectionReason && (
              <Text style={styles.rejectionText}>Reason: {licenseDoc.rejectionReason}</Text>
            )}
            {licenseDoc.status !== 'APPROVED' && (
              <View style={styles.documentActions}>
                <TouchableOpacity style={styles.reuploadBtn} onPress={() => { handleDelete(licenseDoc); }}>
                  <Text style={styles.reuploadBtnText}>🗑 Remove & Re-upload</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        ) : (
          <TouchableOpacity
            style={[styles.uploadBtn, uploading && styles.uploadBtnDisabled]}
            onPress={() => handleUpload('Medical License')}
            disabled={uploading}
          >
            <Text style={styles.uploadBtnText}>{uploading ? '⏳ Uploading...' : '📎 Choose File'}</Text>
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Government ID Proof</Text>
        <Text style={styles.sectionSub}>Aadhaar, Passport, or Voter ID</Text>
        {govIdDoc ? (
          <View style={styles.documentCard}>
            <View style={styles.documentInfo}>
              <Text style={styles.fileName}>✓ {govIdDoc.type}</Text>
              <View style={[styles.statusBadge, { backgroundColor: docStatusColors[govIdDoc.status] }]}>
                <Text style={styles.statusBadgeText}>{govIdDoc.status}</Text>
              </View>
            </View>
            {govIdDoc.status === 'REJECTED' && govIdDoc.rejectionReason && (
              <Text style={styles.rejectionText}>Reason: {govIdDoc.rejectionReason}</Text>
            )}
            {govIdDoc.status !== 'APPROVED' && (
              <View style={styles.documentActions}>
                <TouchableOpacity style={styles.reuploadBtn} onPress={() => { handleDelete(govIdDoc); }}>
                  <Text style={styles.reuploadBtnText}>🗑 Remove & Re-upload</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        ) : (
          <TouchableOpacity
            style={[styles.uploadBtn, uploading && styles.uploadBtnDisabled]}
            onPress={() => handleUpload('Government ID')}
            disabled={uploading}
          >
            <Text style={styles.uploadBtnText}>{uploading ? '⏳ Uploading...' : '📎 Choose File'}</Text>
          </TouchableOpacity>
        )}
      </View>

      {uploading && (
        <View style={styles.uploadingOverlay}>
          <ActivityIndicator size="small" color={Colors.primary} />
          <Text style={styles.uploadingText}>Uploading document...</Text>
        </View>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.background },
  loadingText: { marginTop: 12, fontSize: 14, color: Colors.textMuted },
  header: { backgroundColor: Colors.primary, padding: 20, paddingTop: 60 },
  headerTitle: { fontSize: 22, fontWeight: '800', color: Colors.white },
  statusBanner: { margin: 16, borderRadius: 10, padding: 14, alignItems: 'center' },
  statusText: { fontSize: 15, fontWeight: '700', color: Colors.white },
  errorBanner: { marginHorizontal: 16, marginBottom: 8, backgroundColor: '#FEF2F2', borderRadius: 10, padding: 12, borderWidth: 1, borderColor: '#FECACA' },
  errorText: { fontSize: 13, color: Colors.error, fontWeight: '600' },
  section: { backgroundColor: Colors.white, margin: 16, marginBottom: 0, borderRadius: 12, padding: 16, elevation: 2 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: Colors.text, marginBottom: 4 },
  sectionSub: { fontSize: 13, color: Colors.textMuted, marginBottom: 12 },
  uploadBtn: { borderWidth: 2, borderColor: Colors.primary, borderStyle: 'dashed', borderRadius: 10, padding: 16, alignItems: 'center' },
  uploadBtnDisabled: { borderColor: Colors.textMuted },
  uploadBtnText: { fontSize: 15, fontWeight: '600', color: Colors.primary },
  documentCard: { backgroundColor: Colors.background, borderRadius: 10, padding: 12 },
  documentInfo: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  fileName: { fontSize: 14, color: Colors.text, fontWeight: '600', flex: 1 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  statusBadgeText: { fontSize: 11, fontWeight: '700', color: Colors.white },
  rejectionText: { marginTop: 8, fontSize: 12, color: Colors.error, fontStyle: 'italic' },
  documentActions: { marginTop: 10, flexDirection: 'row' },
  reuploadBtn: { backgroundColor: '#FEF2F2', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8 },
  reuploadBtnText: { fontSize: 13, fontWeight: '600', color: Colors.error },
  uploadingOverlay: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', margin: 16, padding: 12, backgroundColor: Colors.white, borderRadius: 10 },
  uploadingText: { marginLeft: 8, fontSize: 14, color: Colors.textMuted },
});
