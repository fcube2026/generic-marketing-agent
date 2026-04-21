import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Alert,
  ActivityIndicator,
  Modal,
  TextInput,
  FlatList,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Colors } from '../../constants/colors';
import { Button } from '../../components/common/Button';
import { formatCurrency } from '../../utils/format';
import { PatientStackParamList } from '../../navigation/PatientNavigator';
import api from '../../services/api';
import { ENDPOINTS } from '../../constants/api';
import { pharmacyService } from '../../services/pharmacyService';
import { MedicineResult } from '../../types';
import {
  usePharmacyOrderStore,
  MOCK_PHARMACIES,
  PrescriptionMedicine,
} from '../../store/pharmacyOrderStore';

type Nav = NativeStackNavigationProp<PatientStackParamList>;
type Route = RouteProp<PatientStackParamList, 'PrescriptionOrder'>;

/** Shape returned by GET /consultation/latest */
type LatestConsultationResponse = {
  consultationId: string;
  createdAt: string;
  prescriptionUrl: string | null;
  medicines: Array<{
    name?: string;
    dosage?: string;
    frequency?: string;
    duration?: string;
    quantity?: number;
    unitPrice?: number;
  }> | null;
};

const getUploadMimeType = (filename: string): string => {
  const extension = filename.split('.').pop()?.toLowerCase();

  switch (extension) {
    case 'jpg':
    case 'jpeg':
      return 'image/jpeg';
    case 'png':
      return 'image/png';
    case 'pdf':
      return 'application/pdf';
    default:
      return 'image/jpeg';
  }
};

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

/** Skeleton placeholder while uploading */
const SkeletonBox: React.FC<{ width?: number | string; height?: number }> = ({
  width = '100%',
  height = 16,
}) => (
  <View
    style={[
      styles.skeleton,
      { width: width as any, height, borderRadius: height / 2 },
    ]}
  />
);

// ---------------------------------------------------------------------------
// Main Screen
// ---------------------------------------------------------------------------

export const PrescriptionOrderScreen: React.FC = () => {
  const navigation = useNavigation<Nav>();
  const route = useRoute<Route>();
  const [previewVisible, setPreviewVisible] = useState(false);

  // ---- Inline medicine search state ---------------------------------------
  const [addMedQuery, setAddMedQuery] = useState('');
  const [addMedResults, setAddMedResults] = useState<MedicineResult[]>([]);
  const [addMedLoading, setAddMedLoading] = useState(false);
  const addMedSearchRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const {
    prescriptionUrl,
    isUploading,
    uploadError,
    medicines,
    setPrescription,
    clearPrescription,
    setUploading,
    setUploadError,
    setMedicines,
    updateMedicineQuantity,
    resetOrder,
  } = usePharmacyOrderStore();

  // ---- Debounced medicine search ------------------------------------------
  useEffect(() => {
    if (addMedSearchRef.current) clearTimeout(addMedSearchRef.current);
    const trimmed = addMedQuery.trim();
    if (trimmed.length < 2) {
      setAddMedResults([]);
      return;
    }
    addMedSearchRef.current = setTimeout(async () => {
      setAddMedLoading(true);
      try {
        const results = await pharmacyService.searchMedicines(trimmed);
        setAddMedResults(results ?? []);
      } catch {
        setAddMedResults([]);
      } finally {
        setAddMedLoading(false);
      }
    }, 350);
    return () => {
      if (addMedSearchRef.current) clearTimeout(addMedSearchRef.current);
    };
  }, [addMedQuery]);

  const addMedicineFromSearch = useCallback(
    (med: MedicineResult) => {
      const existing = medicines.find((m) => m.name === med.name);
      if (existing) {
        updateMedicineQuantity(existing.id, 1);
      } else {
        const newId = medicines.length > 0 ? Math.max(...medicines.map((m) => m.id)) + 1 : 1;
        setMedicines([
          ...medicines,
          { id: newId, name: med.name, quantity: 1, unitPrice: med.price },
        ]);
      }
      setAddMedQuery('');
      setAddMedResults([]);
    },
    [medicines, setMedicines, updateMedicineQuantity],
  );

  // ---- Auto-attach prescription from navigation params ---------------------
  useEffect(() => {
    const incomingUrl = route.params?.prescriptionUrl;
    if (incomingUrl && !prescriptionUrl) {
      setPrescription(incomingUrl);
    }
  }, [route.params?.prescriptionUrl, prescriptionUrl, setPrescription]);

  const [recentLoading, setRecentLoading] = useState(false);
  const [recentError, setRecentError] = useState<string | null>(null);

  // ---- Load all medicines from mock DB -----------------------------------
  const loadAllMedicines = useCallback(async () => {
    try {
      const results = await pharmacyService.searchMedicines('');
      if (results && results.length > 0) {
        const mapped: PrescriptionMedicine[] = results.map((m, i) => ({
          id: i + 1,
          name: m.name,
          quantity: 1,
          unitPrice: m.price,
        }));
        setMedicines(mapped);
      }
    } catch {
      // silently ignore — user can still add manually
    }
  }, [setMedicines]);

  // ---- Auto-load medicines on mount --------------------------------------
  useEffect(() => {
    if (medicines.length === 0) {
      loadAllMedicines();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ---- Shared: fetch medicines from latest consultation -------------------
  const fetchConsultationMedicines = useCallback(
    async (): Promise<boolean> => {
      try {
        const res = await api.get<LatestConsultationResponse | null>(
          '/consultation/latest',
        );
        const data = res.data;
        if (!data || (!data.prescriptionUrl && (!data.medicines || data.medicines.length === 0))) {
          return false;
        }
        const mappedMedicines: PrescriptionMedicine[] = (data.medicines ?? [])
          .filter((m) => m && (m.name ?? '').trim().length > 0)
          .map((m, i) => ({
            id: i + 1,
            name: m!.name as string,
            quantity: typeof m!.quantity === 'number' && m!.quantity > 0 ? m!.quantity : 1,
            unitPrice: typeof m!.unitPrice === 'number' ? m!.unitPrice : 0,
          }));
        if (mappedMedicines.length > 0) {
          setMedicines(mappedMedicines);
          return true;
        }
        return false;
      } catch {
        return false;
      }
    },
    [setMedicines],
  );

  // ---- Prescription upload via API -----------------------------------------
  const uploadPrescription = useCallback(
    async (uri: string) => {
      setUploading(true);
      setUploadError(null);
      try {
        const filename = uri.split('/').pop() ?? 'prescription.jpg';
        const mimeType = getUploadMimeType(filename);

        const formData = new FormData();
        formData.append('file', {
          uri,
          name: filename,
          type: mimeType,
        } as unknown as Blob);

        const response = await api.post(
          ENDPOINTS.PHARMACY.PRESCRIPTIONS_UPLOAD,
          formData,
        );

        const uploadedUrl: string =
          response.data?.fileUrl ?? response.data?.url ?? uri;
        setPrescription(uploadedUrl);

        // Try consultation medicines first, fall back to full mock catalog
        const gotMeds = await fetchConsultationMedicines();
        if (!gotMeds) await loadAllMedicines();
      } catch (err: unknown) {
        const message =
          (err as { response?: { data?: { message?: string } } })?.response
            ?.data?.message ?? 'Upload failed. Using local image.';
        setPrescription(uri);
        setUploadError(message);
        const gotMeds = await fetchConsultationMedicines();
        if (!gotMeds) await loadAllMedicines();
      } finally {
        setUploading(false);
      }
    },
    [setPrescription, setUploading, setUploadError, fetchConsultationMedicines, loadAllMedicines],
  );

  // ---- Image picker helpers ------------------------------------------------
  const pickFromCamera = useCallback(async () => {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      Alert.alert(
        'Permission required',
        'Camera access is needed to take a photo of your prescription.',
      );
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
    });
    if (!result.canceled && result.assets[0]) {
      await uploadPrescription(result.assets[0].uri);
    }
  }, [uploadPrescription]);

  const pickFromGallery = useCallback(async () => {
    const permission =
      await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert(
        'Permission required',
        'Gallery access is needed to pick a prescription image.',
      );
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
    });
    if (!result.canceled && result.assets[0]) {
      await uploadPrescription(result.assets[0].uri);
    }
  }, [uploadPrescription]);

  const useRecentConsultation = useCallback(async () => {
    setRecentLoading(true);
    setRecentError(null);
    try {
      const res = await api.get<LatestConsultationResponse | null>(
        '/consultation/latest',
      );
      const data = res.data;
      if (!data || (!data.prescriptionUrl && (!data.medicines || data.medicines.length === 0))) {
        setRecentError('No recent prescription found');
        return;
      }

      const mappedMedicines: PrescriptionMedicine[] = (data.medicines ?? [])
        .filter((m) => m && (m.name ?? '').trim().length > 0)
        .map((m, i) => ({
          id: i + 1,
          name: m!.name as string,
          quantity: typeof m!.quantity === 'number' && m!.quantity > 0 ? m!.quantity : 1,
          unitPrice: typeof m!.unitPrice === 'number' ? m!.unitPrice : 0,
        }));

      if (data.prescriptionUrl) {
        setPrescription(data.prescriptionUrl);
      }
      if (mappedMedicines.length > 0) {
        setMedicines(mappedMedicines);
      }
    } catch (err) {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response
          ?.data?.message ?? 'Could not load your recent prescription.';
      setRecentError(message);
    } finally {
      setRecentLoading(false);
    }
  }, [setPrescription, setMedicines]);

  // ---- Checkout validation -------------------------------------------------
  const subtotal = medicines.reduce(
    (sum, m) => sum + m.unitPrice * m.quantity,
    0,
  );
  const defaultPharmacy = MOCK_PHARMACIES[0] ?? null;
  const deliveryFee = defaultPharmacy?.deliveryFee ?? 0;
  const total = subtotal + deliveryFee;
  const canProceed = medicines.length > 0 && !isUploading;

  const handleProceed = () => {
    if (medicines.length === 0) {
      Alert.alert('No medicines', 'Please add at least one medicine.');
      return;
    }
    // Navigate to PharmacyCheckoutScreen – data is already in Zustand store
    navigation.navigate('PharmacyCheckout', {
      cartItems: medicines.map((m) => ({
        medicine: {
          id: String(m.id),
          name: m.name,
          price: m.unitPrice,
        },
        quantity: m.quantity,
      })),
    });
  };

  // ---- Cleanup on unmount --------------------------------------------------
  useEffect(() => () => resetOrder(), [resetOrder]);

  // ========================================================================
  // Render
  // ========================================================================
  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
      keyboardShouldPersistTaps="handled"
    >
      {/* ----------------------------------------------------------------- */}
      {/* 1. Prescription Source Selection                                   */}
      {/* ----------------------------------------------------------------- */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>📋 Prescription</Text>

        <Text style={styles.helperText}>
          Prescription is optional here. You can continue with medicine selection and add a prescription later if needed.
        </Text>

        {!prescriptionUrl && !isUploading && (
          <>
            <TouchableOpacity
              style={[styles.sourceOption, recentLoading && { opacity: 0.6 }]}
              onPress={useRecentConsultation}
              disabled={recentLoading}
            >
              <Text style={styles.sourceIcon}>🩺</Text>
              <View style={styles.sourceTextWrap}>
                <Text style={styles.sourceTitle}>
                  {recentLoading ? 'Loading recent prescription…' : 'Use Recent Prescription'}
                </Text>
                <Text style={styles.sourceSubtitle}>
                  Use your last doctor-issued prescription
                </Text>
              </View>
              <Text style={styles.arrow}>→</Text>
            </TouchableOpacity>

            {recentError && (
              <View style={styles.errorBanner}>
                <Text style={styles.errorText}>ℹ️ {recentError}</Text>
              </View>
            )}

            <View style={styles.dividerRow}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>OR</Text>
              <View style={styles.dividerLine} />
            </View>

            <Text style={styles.uploadLabel}>Upload Prescription</Text>
            <View style={styles.uploadRow}>
              <TouchableOpacity
                style={styles.uploadBtn}
                onPress={pickFromCamera}
              >
                <Text style={styles.uploadBtnIcon}>📷</Text>
                <Text style={styles.uploadBtnText}>Camera</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.uploadBtn}
                onPress={pickFromGallery}
              >
                <Text style={styles.uploadBtnIcon}>🖼️</Text>
                <Text style={styles.uploadBtnText}>Gallery</Text>
              </TouchableOpacity>
            </View>
          </>
        )}

        {/* Loading state */}
        {isUploading && (
          <View style={styles.uploadingWrap}>
            <ActivityIndicator size="large" color={Colors.primary} />
            <Text style={styles.uploadingText}>Uploading prescription…</Text>
            <SkeletonBox height={120} />
          </View>
        )}

        {/* Upload error */}
        {uploadError && (
          <View style={styles.errorBanner}>
            <Text style={styles.errorText}>⚠️ {uploadError}</Text>
          </View>
        )}

        {/* ----------------------------------------------------------------- */}
        {/* 2. Prescription Preview                                           */}
        {/* ----------------------------------------------------------------- */}
        {prescriptionUrl && !isUploading && (
          <View style={styles.previewWrap}>
            <TouchableOpacity onPress={() => setPreviewVisible(true)}>
              <Image
                source={{ uri: prescriptionUrl }}
                style={styles.previewImage}
                resizeMode="cover"
              />
              <Text style={styles.tapHint}>Tap to enlarge</Text>
            </TouchableOpacity>
            <Button
              title="Change Prescription"
              variant="outline"
              onPress={() => {
                clearPrescription();
              }}
              style={styles.changeBtn}
            />
          </View>
        )}
      </View>

      {/* ----------------------------------------------------------------- */}
      {/* 3. Medicine List                                                   */}
      {/* ----------------------------------------------------------------- */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>💊 Medicines</Text>

        {isUploading && (
          <View style={styles.skeletonList}>
            {[1, 2, 3].map((i) => (
              <View key={i} style={styles.skeletonRow}>
                <SkeletonBox width="60%" height={14} />
                <SkeletonBox width={60} height={28} />
              </View>
            ))}
          </View>
        )}

        {!isUploading && medicines.length === 0 && (
          <Text style={styles.emptyText}>
            No medicines found. Search and add medicines from your prescription below.
          </Text>
        )}

        {!isUploading && medicines.length > 0 && (
          <View style={styles.extractedBanner}>
            <Text style={styles.extractedBannerText}>
              ✅ {medicines.length} medicine{medicines.length > 1 ? 's' : ''} loaded from your prescription. Adjust quantities as needed.
            </Text>
          </View>
        )}

        {!isUploading &&
          medicines.map((med) => (
            <View key={med.id} style={styles.medicineRow}>
              <View style={styles.medicineInfo}>
                <Text style={styles.medicineName}>{med.name}</Text>
                <Text style={styles.medicinePrice}>
                  {formatCurrency(med.unitPrice)} × {med.quantity} ={' '}
                  {formatCurrency(med.unitPrice * med.quantity)}
                </Text>
              </View>
              <View style={styles.qtyControls}>
                <TouchableOpacity
                  style={styles.qtyBtn}
                  onPress={() => updateMedicineQuantity(med.id, -1)}
                >
                  <Text style={styles.qtyBtnText}>−</Text>
                </TouchableOpacity>
                <Text style={styles.qtyValue}>{med.quantity}</Text>
                <TouchableOpacity
                  style={styles.qtyBtn}
                  onPress={() => updateMedicineQuantity(med.id, 1)}
                >
                  <Text style={styles.qtyBtnText}>+</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))}

        {!isUploading && medicines.length > 0 && (
          <View style={styles.subtotalRow}>
            <Text style={styles.subtotalLabel}>Subtotal</Text>
            <Text style={styles.subtotalValue}>{formatCurrency(subtotal)}</Text>
          </View>
        )}

        {/* Inline add-medicine search */}
        {!isUploading && (
          <View style={styles.addMedWrap}>
            <Text style={styles.addMedTitle}>➕ Add Medicine</Text>
            <TextInput
              style={styles.addMedInput}
              placeholder="Search by medicine name…"
              placeholderTextColor={Colors.textMuted}
              value={addMedQuery}
              onChangeText={setAddMedQuery}
              autoCorrect={false}
              autoCapitalize="none"
            />
            {addMedLoading && (
              <ActivityIndicator size="small" color={Colors.primary} style={{ marginTop: 6 }} />
            )}
            {addMedResults.length > 0 && (
              <FlatList
                data={addMedResults.slice(0, 6)}
                keyExtractor={(item) => item.id}
                keyboardShouldPersistTaps="handled"
                scrollEnabled={false}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={styles.addMedResult}
                    onPress={() => addMedicineFromSearch(item)}
                  >
                    <View style={{ flex: 1 }}>
                      <Text style={styles.addMedResultName}>{item.name}</Text>
                      {item.manufacturer ? (
                        <Text style={styles.addMedResultMfg}>{item.manufacturer}</Text>
                      ) : null}
                    </View>
                    <Text style={styles.addMedResultPrice}>{formatCurrency(item.price)}</Text>
                  </TouchableOpacity>
                )}
              />
            )}
            {!addMedLoading && addMedQuery.trim().length >= 2 && addMedResults.length === 0 && (
              <Text style={styles.addMedEmpty}>No medicines found for "{addMedQuery}"</Text>
            )}
          </View>
        )}
      </View>

      {medicines.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🧾 Order Summary</Text>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Medicines subtotal</Text>
            <Text style={styles.summaryValue}>{formatCurrency(subtotal)}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Delivery fee</Text>
            <Text style={styles.summaryValue}>{formatCurrency(deliveryFee)}</Text>
          </View>
          <View style={[styles.summaryRow, styles.totalRow]}>
            <Text style={styles.totalLabel}>Estimated total</Text>
            <Text style={styles.totalValue}>{formatCurrency(total)}</Text>
          </View>
        </View>
      )}

      <View style={styles.checkoutArea}>
        <Button
          title={
            medicines.length === 0
              ? 'No Medicines Selected'
              : `Proceed to Checkout — ${formatCurrency(total)}`
          }
          onPress={handleProceed}
          disabled={!canProceed}
          loading={isUploading}
        />
      </View>

      <View style={styles.bottomSpacer} />

      {/* ----------------------------------------------------------------- */}
      {/* Image Preview Modal                                                */}
      {/* ----------------------------------------------------------------- */}
      <Modal
        visible={previewVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setPreviewVisible(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setPreviewVisible(false)}
        >
          <Image
            source={{ uri: prescriptionUrl ?? '' }}
            style={styles.modalImage}
            resizeMode="contain"
          />
          <Text style={styles.modalClose}>Tap anywhere to close</Text>
        </TouchableOpacity>
      </Modal>
    </ScrollView>
  );
};

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  contentContainer: { paddingBottom: 32 },

  // Section
  section: {
    backgroundColor: Colors.white,
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 12,
    padding: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 },
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 12,
  },
  helperText: {
    fontSize: 13,
    color: Colors.textMuted,
    lineHeight: 18,
    marginBottom: 12,
  },

  // Source selection
  sourceOption: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.background,
    borderRadius: 10,
    padding: 14,
    marginBottom: 12,
  },
  sourceIcon: { fontSize: 28, marginRight: 12 },
  sourceTextWrap: { flex: 1 },
  sourceTitle: { fontSize: 15, fontWeight: '700', color: Colors.text },
  sourceSubtitle: { fontSize: 12, color: Colors.textMuted, marginTop: 2 },
  arrow: { fontSize: 18, color: Colors.textMuted },

  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 8,
  },
  dividerLine: { flex: 1, height: 1, backgroundColor: Colors.border },
  dividerText: {
    marginHorizontal: 12,
    fontSize: 13,
    color: Colors.textMuted,
    fontWeight: '600',
  },

  uploadLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 8,
  },
  uploadRow: { flexDirection: 'row', gap: 12 },
  uploadBtn: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: Colors.primaryLight,
    borderRadius: 10,
    paddingVertical: 16,
  },
  uploadBtnIcon: { fontSize: 24, marginBottom: 4 },
  uploadBtnText: { fontSize: 13, fontWeight: '600', color: Colors.primary },

  // Uploading
  uploadingWrap: { alignItems: 'center', paddingVertical: 20, gap: 12 },
  uploadingText: { fontSize: 14, color: Colors.textMuted },

  // Error
  errorBanner: {
    backgroundColor: '#FEF2F2',
    borderRadius: 8,
    padding: 10,
    marginTop: 8,
  },
  errorText: { fontSize: 13, color: Colors.error },

  // Preview
  previewWrap: { alignItems: 'center' },
  previewImage: {
    width: '100%',
    height: 180,
    borderRadius: 10,
    backgroundColor: Colors.border,
  },
  tapHint: {
    fontSize: 11,
    color: Colors.textMuted,
    marginTop: 4,
    textAlign: 'center',
  },
  changeBtn: { marginTop: 10, width: '100%' },

  // Skeleton
  skeleton: { backgroundColor: Colors.border, marginBottom: 8 },
  skeletonList: { gap: 12 },
  skeletonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  // Medicine list
  emptyText: {
    fontSize: 14,
    color: Colors.textMuted,
    fontStyle: 'italic',
    textAlign: 'center',
    paddingVertical: 12,
  },
  extractedBanner: {
    backgroundColor: Colors.primaryLight,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 8,
  },
  extractedBannerText: {
    fontSize: 13,
    color: Colors.primary,
    fontWeight: '600',
  },
  medicineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  medicineInfo: { flex: 1 },
  medicineName: { fontSize: 15, fontWeight: '600', color: Colors.text },
  medicinePrice: { fontSize: 12, color: Colors.textMuted, marginTop: 2 },
  qtyControls: { flexDirection: 'row', alignItems: 'center' },
  qtyBtn: {
    backgroundColor: Colors.primaryLight,
    borderRadius: 6,
    width: 30,
    height: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  qtyBtnText: { fontSize: 18, fontWeight: '700', color: Colors.primary },
  qtyValue: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.text,
    marginHorizontal: 10,
  },
  subtotalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 12,
  },
  subtotalLabel: { fontSize: 14, fontWeight: '600', color: Colors.text },
  subtotalValue: { fontSize: 15, fontWeight: '700', color: Colors.primary },

  // Inline add-medicine search
  addMedWrap: {
    marginTop: 16,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    paddingTop: 14,
  },
  addMedTitle: { fontSize: 14, fontWeight: '700', color: Colors.text, marginBottom: 8 },
  addMedInput: {
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    color: Colors.text,
    backgroundColor: Colors.background,
  },
  addMedResult: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 4,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  addMedResultName: { fontSize: 14, fontWeight: '600', color: Colors.text },
  addMedResultMfg: { fontSize: 12, color: Colors.textMuted },
  addMedResultPrice: { fontSize: 14, fontWeight: '700', color: Colors.primary },
  addMedEmpty: { fontSize: 13, color: Colors.textMuted, fontStyle: 'italic', marginTop: 8 },

  // Pharmacy selection
  pharmacyCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderRadius: 10,
    padding: 14,
    marginBottom: 10,
  },
  pharmacyCardSelected: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primaryLight,
  },
  pharmacyInfo: { flex: 1 },
  pharmacyName: { fontSize: 15, fontWeight: '700', color: Colors.text },
  pharmacyMeta: { fontSize: 12, color: Colors.textMuted, marginTop: 2 },
  pharmacyTotal: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.primary,
    marginTop: 4,
  },
  radioBtn: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: Colors.border,
    marginLeft: 12,
  },
  radioBtnSelected: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primary,
  },

  // Order summary
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
  },
  summaryLabel: { fontSize: 14, color: Colors.textMuted },
  summaryValue: { fontSize: 14, fontWeight: '600', color: Colors.text },
  totalRow: {
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    marginTop: 8,
    paddingTop: 10,
  },
  totalLabel: { fontSize: 16, fontWeight: '700', color: Colors.text },
  totalValue: { fontSize: 16, fontWeight: '800', color: Colors.primary },

  // Checkout
  checkoutArea: { marginHorizontal: 16, marginTop: 20 },
  bottomSpacer: { height: 40 },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: Colors.overlay,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  modalImage: { width: '100%', height: '70%', borderRadius: 12 },
  modalClose: {
    color: Colors.white,
    fontSize: 14,
    marginTop: 16,
    fontWeight: '600',
  },
});
