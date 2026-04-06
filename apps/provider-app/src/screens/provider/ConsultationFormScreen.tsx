import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TextInput,
  TouchableOpacity, SafeAreaView, Switch, Alert,
} from 'react-native';
import { useRoute, useNavigation, RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Colors } from '../../constants/colors';
import { consultationService, referralService } from '../../services/providerService';
import type { ProviderStackParamList } from '../../navigation/ProviderNavigator';

type Route = RouteProp<ProviderStackParamList, 'ConsultationForm'>;
type Nav = NativeStackNavigationProp<ProviderStackParamList>;

type Medicine = { name: string; dosage: string };

export const ConsultationFormScreen: React.FC = () => {
  const route = useRoute<Route>();
  const navigation = useNavigation<Nav>();
  const { bookingId } = route.params;

  const [symptoms, setSymptoms] = useState('');
  const [observations, setObservations] = useState('');
  const [diagnosis, setDiagnosis] = useState('');
  const [medicines, setMedicines] = useState<Medicine[]>([{ name: '', dosage: '' }]);
  const [nextSteps, setNextSteps] = useState('');
  const [followUpNeeded, setFollowUpNeeded] = useState(false);
  const [followUpNotes, setFollowUpNotes] = useState('');
  const [diagnosticNeeded, setDiagnosticNeeded] = useState(false);
  const [diagnosticTests, setDiagnosticTests] = useState('');
  const [referralNeeded, setReferralNeeded] = useState(false);
  const [specialistType, setSpecialistType] = useState('');
  const [referralNotes, setReferralNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const addMedicine = () => setMedicines(prev => [...prev, { name: '', dosage: '' }]);
  const removeMedicine = (index: number) => setMedicines(prev => prev.filter((_, i) => i !== index));
  const updateMedicine = (index: number, field: keyof Medicine, value: string) => {
    setMedicines(prev => prev.map((m, i) => i === index ? { ...m, [field]: value } : m));
  };

  const handleSubmit = async () => {
    if (!symptoms.trim() || !diagnosis.trim()) {
      Alert.alert('Required', 'Please fill in symptoms and diagnosis.');
      return;
    }
    setSubmitting(true);
    try {
      await consultationService.submitSummary(bookingId, {
        symptoms,
        observations,
        diagnosis,
        medicinesAdvised: medicines.filter(m => m.name.trim()),
        nextSteps,
        followUpRecommendation: followUpNeeded ? followUpNotes : undefined,
        diagnosticTests: diagnosticNeeded ? diagnosticTests : undefined,
      });

      if (referralNeeded && specialistType.trim()) {
        await referralService.createReferral({
          bookingId,
          specialistType: specialistType.trim(),
          notes: referralNotes.trim() || undefined,
        });
      }

      Alert.alert('Summary Submitted', 'Consultation summary saved successfully.', [
        { text: 'OK', onPress: () => navigation.navigate('Tabs') },
      ]);
    } catch {
      Alert.alert('Error', 'Failed to submit summary. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
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
          <View key={i} style={styles.medicineRow}>
            <TextInput style={[styles.input, { flex: 1 }]} value={m.name}
              onChangeText={v => updateMedicine(i, 'name', v)} placeholder="Medicine name" />
            <TextInput style={[styles.input, { width: 110, marginLeft: 8 }]} value={m.dosage}
              onChangeText={v => updateMedicine(i, 'dosage', v)} placeholder="Dosage" />
            {medicines.length > 1 && (
              <TouchableOpacity style={styles.removeBtn} onPress={() => removeMedicine(i)}>
                <Text style={styles.removeBtnText}>✕</Text>
              </TouchableOpacity>
            )}
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
          <>
            <TextInput style={styles.input} value={specialistType} onChangeText={setSpecialistType}
              placeholder="e.g. Cardiologist, Orthopedic Surgeon" />
            <TextInput style={styles.textarea} value={referralNotes} onChangeText={setReferralNotes}
              placeholder="Referral reason / additional notes…" multiline numberOfLines={2} />
          </>
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
  intro: { fontSize: 13, color: Colors.textMuted, marginBottom: 20, lineHeight: 18 },
  label: { fontSize: 14, fontWeight: '700', color: Colors.text, marginBottom: 6, marginTop: 16 },
  input: { borderWidth: 1, borderColor: Colors.border, borderRadius: 10, padding: 12, backgroundColor: Colors.white, fontSize: 14, color: Colors.text },
  textarea: { borderWidth: 1, borderColor: Colors.border, borderRadius: 10, padding: 12, backgroundColor: Colors.white, fontSize: 14, color: Colors.text, textAlignVertical: 'top', minHeight: 72 },
  medicineRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  removeBtn: { marginLeft: 8, padding: 10 },
  removeBtnText: { color: Colors.error, fontSize: 16, fontWeight: '700' },
  addMedBtn: { marginTop: 4, paddingVertical: 10, alignItems: 'center', borderWidth: 1, borderColor: Colors.primary, borderRadius: 10, borderStyle: 'dashed' },
  addMedBtnText: { color: Colors.primary, fontWeight: '600' },
  toggleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 20, marginBottom: 8 },
  toggleLabel: { fontSize: 15, fontWeight: '600', color: Colors.text },
  submitBtn: { backgroundColor: Colors.primary, borderRadius: 14, padding: 18, alignItems: 'center', marginTop: 32 },
  submitBtnText: { color: Colors.white, fontSize: 16, fontWeight: '700' },
});
