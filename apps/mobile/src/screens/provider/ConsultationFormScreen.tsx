import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TextInput,
  TouchableOpacity, SafeAreaView, Switch, Alert, FlatList,
} from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import { useRoute, useNavigation, RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Colors } from '../../constants/colors';
import {
  consultationService,
  diagnosticsService,
  referralService,
} from '../../services/providerService';
import { bookingService } from '../../services/bookingService';
import { pharmacyService } from '../../services/pharmacyService';
import type { ProviderStackParamList } from '../../navigation/ProviderNavigator';
import type { MedicineResult } from '../../types';

type Route = RouteProp<ProviderStackParamList, 'ConsultationForm'>;
type Nav = NativeStackNavigationProp<ProviderStackParamList>;

type Medicine = {
  name: string;
  dosage: string;
  frequency: string;
  duration: string;
};

/**
 * Lightweight autocomplete input that reuses the patient-side pharmacy
 * search so the doctor selects medicines from the same dataset (provider
 * pattern preserves the abstraction).
 */
const MedicineAutocompleteInput: React.FC<{
  value: string;
  onChange: (value: string) => void;
}> = ({ value, onChange }) => {
  const [focused, setFocused] = useState(false);
  const [suggestions, setSuggestions] = useState<MedicineResult[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!focused) return;
    const trimmed = value.trim();
    if (trimmed.length < 2) {
      setSuggestions([]);
      return;
    }
    let cancelled = false;
    const handle = setTimeout(async () => {
      setLoading(true);
      try {
        const results = await pharmacyService.searchMedicines(trimmed);
        if (!cancelled) setSuggestions(results);
      } catch {
        if (!cancelled) setSuggestions([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }, 300);
    return () => {
      cancelled = true;
      clearTimeout(handle);
    };
  }, [value, focused]);

  const showDropdown = focused && value.trim().length >= 2;

  return (
    <View style={{ flex: 1 }}>
      <TextInput
        style={styles.input}
        value={value}
        onChangeText={onChange}
        onFocus={() => setFocused(true)}
        onBlur={() => {
          // Brief delay so a tap on a suggestion (which fires after blur on
          // Android) is processed before the dropdown is hidden.
          setTimeout(() => setFocused(false), 150);
        }}
        placeholder="Medicine name"
        autoCorrect={false}
        autoCapitalize="none"
      />
      {showDropdown && (
        <View style={styles.suggestionDropdown}>
          {loading && (
            <Text style={styles.suggestionMuted}>Searching…</Text>
          )}
          {!loading && suggestions.length === 0 && (
            <Text style={styles.suggestionMuted}>No matches</Text>
          )}
          {!loading && suggestions.length > 0 && (
            <FlatList
              data={suggestions}
              keyboardShouldPersistTaps="handled"
              keyExtractor={(item) => item.id}
              style={{ maxHeight: 180 }}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.suggestionItem}
                  onPress={() => {
                    onChange(item.name);
                    setFocused(false);
                  }}
                >
                  <Text style={styles.suggestionItemText}>{item.name}</Text>
                  {item.requiresPrescription && (
                    <Text style={styles.rxBadge}>Rx</Text>
                  )}
                </TouchableOpacity>
              )}
            />
          )}
        </View>
      )}
    </View>
  );
};

export const ConsultationFormScreen: React.FC = () => {
  const route = useRoute<Route>();
  const navigation = useNavigation<Nav>();
  const { bookingId, patientName: routePatientName, patientId: routePatientId } = route.params;
  const [booking, setBooking] = useState<any>(null);

  const [symptoms, setSymptoms] = useState('');
  const [observations, setObservations] = useState('');
  const [diagnosis, setDiagnosis] = useState('');
  const [medicines, setMedicines] = useState<Medicine[]>([
    { name: '', dosage: '', frequency: '', duration: '' },
  ]);
  const [nextSteps, setNextSteps] = useState('');
  const [followUpNeeded, setFollowUpNeeded] = useState(false);
  const [followUpNotes, setFollowUpNotes] = useState('');
  const [diagnosticNeeded, setDiagnosticNeeded] = useState(false);
  const [diagnosticTests, setDiagnosticTests] = useState('');
  const [referralNeeded, setReferralNeeded] = useState(false);
  const [specialistType, setSpecialistType] = useState('');
  const [prescriptionDetails, setPrescriptionDetails] = useState('');
  const [prescriptionFile, setPrescriptionFile] = useState<{
    uri: string;
    name: string;
    type: string;
    size?: number;
  } | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    bookingService
      .getBookingById(bookingId)
      .then((data) => {
        if (!cancelled) {
          setBooking(data);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setBooking(null);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [bookingId]);

  // Use params passed from BookingDetailScreen for immediate display; fall back
  // to data from the background fetch once it completes.
  const patientName = booking?.patient?.name || routePatientName || 'Patient';
  const uniquePatientId =
    booking?.patient?.uniquePatientId ||
    (booking?.patient?.id
      ? `PT-${String(booking.patient.id).slice(-8).toUpperCase()}`
      : routePatientId || '—');

  const addMedicine = () =>
    setMedicines(prev => [...prev, { name: '', dosage: '', frequency: '', duration: '' }]);
  const removeMedicine = (index: number) => setMedicines(prev => prev.filter((_, i) => i !== index));
  const updateMedicine = (index: number, field: keyof Medicine, value: string) => {
    setMedicines(prev => prev.map((m, i) => i === index ? { ...m, [field]: value } : m));
  };

  const pickPrescriptionFile = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['image/*', 'application/pdf'],
        copyToCacheDirectory: true,
        multiple: false,
      });

      if (result.canceled) return;

      const asset = result.assets[0];
      setPrescriptionFile({
        uri: asset.uri,
        name: asset.name,
        type: asset.mimeType || 'application/octet-stream',
        size: asset.size,
      });
    } catch {
      Alert.alert('Error', 'Failed to pick prescription file.');
    }
  };

  const handleSubmit = async () => {
    if (!symptoms.trim() || !diagnosis.trim()) {
      Alert.alert('Required', 'Please fill in symptoms and diagnosis.');
      return;
    }
    setSubmitting(true);
    try {
      const hasExistingSubmittedSummary =
        booking?.status === 'SUMMARY_SUBMITTED' || booking?.status === 'CLOSED';

      if (!hasExistingSubmittedSummary) {
        await consultationService.submitSummary(bookingId, {
          symptoms,
          observations: observations || undefined,
          diagnosis,
          medicinesAdvised: medicines.filter(m => m.name.trim()).length > 0
            ? medicines.filter(m => m.name.trim())
            : undefined,
          nextSteps: nextSteps || undefined,
          followUpRecommendation: followUpNeeded ? followUpNotes : undefined,
        });

        setBooking((prev: any) => (prev ? { ...prev, status: 'SUMMARY_SUBMITTED' } : prev));
      }

      if (diagnosticNeeded && diagnosticTests.trim()) {
        await diagnosticsService.createRequest({
          bookingId,
          testType: diagnosticTests.trim(),
        });
      }

      if (referralNeeded && specialistType.trim()) {
        await referralService.createReferral({
          bookingId,
          specialistType: specialistType.trim(),
        });
      }

      if (prescriptionFile) {
        await consultationService.addPrescriptionFile(
          bookingId,
          {
            uri: prescriptionFile.uri,
            name: prescriptionFile.name,
            type: prescriptionFile.type,
          },
          prescriptionDetails.trim() || undefined,
        );
      } else if (prescriptionDetails.trim()) {
        await consultationService.addPrescription(bookingId, {
          details: prescriptionDetails.trim() || undefined,
        });
      }

      Alert.alert('Summary Submitted', 'Consultation summary saved successfully.', [
        { text: 'OK', onPress: () => navigation.navigate('Tabs') },
      ]);
    } catch (err: any) {
      const rawMessage = err?.response?.data?.message || err?.response?.data?.error;
      const message = Array.isArray(rawMessage)
        ? rawMessage.join('\n')
        : rawMessage || err?.message || 'Failed to submit summary. Please try again.';
      Alert.alert('Error', String(message));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.patientHeaderCard}>
          <Text style={styles.patientHeaderLabel}>Patient</Text>
          <Text style={styles.patientHeaderName}>{patientName}</Text>
          <Text style={styles.patientHeaderId}>Patient ID: {uniquePatientId}</Text>
        </View>

        <Text style={styles.intro}>Complete this mandatory summary to close the consultation.</Text>

        {/* Symptoms */}
        <Text style={styles.label}>Presenting Symptoms *</Text>
        <TextInput style={styles.textarea} value={symptoms} onChangeText={setSymptoms}
          placeholder="Describe patient symptoms…" multiline numberOfLines={3} />

        {/* Observations */}
        <Text style={styles.label}>Clinical Observations</Text>
        <TextInput style={styles.textarea} value={observations} onChangeText={setObservations}
          placeholder="Vital signs, physical examination findings…" multiline numberOfLines={3} />

        {/* Diagnosis */}
        <Text style={styles.label}>Diagnosis / Assessment *</Text>
        <TextInput style={styles.textarea} value={diagnosis} onChangeText={setDiagnosis}
          placeholder="Provisional or confirmed diagnosis…" multiline numberOfLines={2} />

        {/* Medicines */}
        <Text style={styles.label}>Medicines Advised</Text>
        {medicines.map((m, i) => (
          <View key={i} style={styles.medicineBlock}>
            <View style={styles.medicineRow}>
              <MedicineAutocompleteInput
                value={m.name}
                onChange={v => updateMedicine(i, 'name', v)}
              />
              {medicines.length > 1 && (
                <TouchableOpacity style={styles.removeBtn} onPress={() => removeMedicine(i)}>
                  <Text style={styles.removeBtnText}>✕</Text>
                </TouchableOpacity>
              )}
            </View>
            <View style={styles.medicineDetailRow}>
              <TextInput
                style={[styles.input, styles.medicineDetail]}
                value={m.dosage}
                onChangeText={v => updateMedicine(i, 'dosage', v)}
                placeholder="Dosage (e.g. 500mg)"
              />
              <TextInput
                style={[styles.input, styles.medicineDetail]}
                value={m.frequency}
                onChangeText={v => updateMedicine(i, 'frequency', v)}
                placeholder="Frequency (e.g. TID)"
              />
              <TextInput
                style={[styles.input, styles.medicineDetail]}
                value={m.duration}
                onChangeText={v => updateMedicine(i, 'duration', v)}
                placeholder="Duration (e.g. 5 days)"
              />
            </View>
          </View>
        ))}
        <TouchableOpacity style={styles.addMedBtn} onPress={addMedicine}>
          <Text style={styles.addMedBtnText}>+ Add Medicine</Text>
        </TouchableOpacity>

        {/* Next Steps */}
        <Text style={styles.label}>Next Steps</Text>
        <TextInput style={styles.textarea} value={nextSteps} onChangeText={setNextSteps}
          placeholder="Rest, fluids, follow-up in X days…" multiline numberOfLines={2} />

        {/* Follow-up */}
        <View style={styles.toggleRow}>
          <Text style={styles.toggleLabel}>Follow-up Required</Text>
          <Switch value={followUpNeeded} onValueChange={setFollowUpNeeded} trackColor={{ true: Colors.primary }} />
        </View>
        {followUpNeeded && (
          <TextInput style={styles.textarea} value={followUpNotes} onChangeText={setFollowUpNotes}
            placeholder="Follow-up in 3 days, monitor fever…" multiline numberOfLines={2} />
        )}

        {/* Diagnostics */}
        <View style={styles.toggleRow}>
          <Text style={styles.toggleLabel}>Diagnostic Tests Required</Text>
          <Switch value={diagnosticNeeded} onValueChange={setDiagnosticNeeded} trackColor={{ true: Colors.primary }} />
        </View>
        {diagnosticNeeded && (
          <TextInput style={styles.textarea} value={diagnosticTests} onChangeText={setDiagnosticTests}
            placeholder="CBC, Blood sugar, Urine culture…" multiline numberOfLines={2} />
        )}

        {/* Referral */}
        <View style={styles.toggleRow}>
          <Text style={styles.toggleLabel}>Specialist Referral</Text>
          <Switch value={referralNeeded} onValueChange={setReferralNeeded} trackColor={{ true: Colors.primary }} />
        </View>
        {referralNeeded && (
          <TextInput style={styles.input} value={specialistType} onChangeText={setSpecialistType}
            placeholder="e.g. Cardiologist, Orthopedic Surgeon" />
        )}

        {/* Prescription */}
        <Text style={styles.label}>Prescription (Optional)</Text>
        <TextInput
          style={styles.textarea}
          value={prescriptionDetails}
          onChangeText={setPrescriptionDetails}
          placeholder="Write prescription details..."
          multiline
          numberOfLines={3}
        />
        <TouchableOpacity style={styles.uploadBtn} onPress={pickPrescriptionFile}>
          <Text style={styles.uploadBtnText}>Upload Prescription Image/PDF</Text>
        </TouchableOpacity>
        {prescriptionFile && (
          <View style={styles.uploadInfoBox}>
            <Text style={styles.uploadInfoText}>Selected: {prescriptionFile.name}</Text>
            {!!prescriptionFile.size && (
              <Text style={styles.uploadInfoMeta}>
                {(prescriptionFile.size / (1024 * 1024)).toFixed(2)} MB
              </Text>
            )}
          </View>
        )}

        <TouchableOpacity
          style={[styles.submitBtn, submitting && { opacity: 0.7 }]}
          onPress={handleSubmit}
          disabled={submitting}
        >
          <Text style={styles.submitBtnText}>{submitting ? 'Submitting…' : '✅ Submit Consultation Summary'}</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { padding: 16, paddingBottom: 50 },
  patientHeaderCard: {
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
  },
  patientHeaderLabel: {
    fontSize: 11,
    color: Colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    fontWeight: '600',
  },
  patientHeaderName: { fontSize: 16, color: Colors.text, fontWeight: '700', marginTop: 4 },
  patientHeaderId: { fontSize: 13, color: Colors.textMuted, marginTop: 2 },
  intro: { fontSize: 13, color: Colors.textMuted, marginBottom: 20, lineHeight: 18 },
  label: { fontSize: 14, fontWeight: '700', color: Colors.text, marginBottom: 6, marginTop: 16 },
  input: { borderWidth: 1, borderColor: Colors.border, borderRadius: 10, padding: 12, backgroundColor: Colors.white, fontSize: 14, color: Colors.text },
  textarea: { borderWidth: 1, borderColor: Colors.border, borderRadius: 10, padding: 12, backgroundColor: Colors.white, fontSize: 14, color: Colors.text, textAlignVertical: 'top', minHeight: 72 },
  medicineBlock: {
    marginBottom: 12,
    padding: 10,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 10,
    backgroundColor: Colors.white,
  },
  medicineRow: { flexDirection: 'row', alignItems: 'flex-start' },
  medicineDetailRow: { flexDirection: 'row', marginTop: 8, gap: 6 },
  medicineDetail: { flex: 1, paddingVertical: 8, fontSize: 12 },
  suggestionDropdown: {
    marginTop: 4,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 10,
    backgroundColor: Colors.white,
    overflow: 'hidden',
  },
  suggestionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  suggestionItemText: { fontSize: 14, color: Colors.text, flex: 1 },
  suggestionMuted: { padding: 12, color: Colors.textMuted, fontSize: 13 },
  rxBadge: {
    marginLeft: 8,
    fontSize: 11,
    fontWeight: '700',
    color: Colors.error,
    borderWidth: 1,
    borderColor: Colors.error,
    borderRadius: 4,
    paddingHorizontal: 5,
    paddingVertical: 1,
  },
  removeBtn: { marginLeft: 8, padding: 10 },
  removeBtnText: { color: Colors.error, fontSize: 16, fontWeight: '700' },
  addMedBtn: { marginTop: 4, paddingVertical: 10, alignItems: 'center', borderWidth: 1, borderColor: Colors.primary, borderRadius: 10, borderStyle: 'dashed' },
  addMedBtnText: { color: Colors.primary, fontWeight: '600' },
  toggleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 20, marginBottom: 8 },
  toggleLabel: { fontSize: 15, fontWeight: '600', color: Colors.text },
  uploadBtn: {
    marginTop: 8,
    borderWidth: 1,
    borderColor: Colors.primary,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
    backgroundColor: Colors.primaryLight,
  },
  uploadBtnText: { color: Colors.primary, fontWeight: '700' },
  uploadInfoBox: {
    marginTop: 8,
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 10,
    padding: 10,
  },
  uploadInfoText: { color: Colors.text, fontSize: 13, fontWeight: '600' },
  uploadInfoMeta: { color: Colors.textMuted, fontSize: 12, marginTop: 2 },
  submitBtn: { backgroundColor: Colors.primary, borderRadius: 14, padding: 18, alignItems: 'center', marginTop: 32 },
  submitBtnText: { color: Colors.white, fontSize: 16, fontWeight: '700' },
});
