import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert, TouchableOpacity, Modal, FlatList } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useQueryClient } from '@tanstack/react-query';
import { Colors } from '../../constants/colors';
import { Button } from '../../components/common/Button';
import { Input } from '../../components/common/Input';
import { Toggle } from '../../components/common/Toggle';
import { providerService } from '../../services/providerService';
import { useAuthStore } from '../../store/authStore';

const SPECIALIZATIONS = [
  'Cardiologist',
  'Dermatologist',
  'Gynecologist',
  'General Physician',
  'Orthopedic',
  'Pediatrician',
  'Neurologist',
  'Psychiatrist',
  'Ophthalmologist',
  'ENT Specialist',
  'Dentist',
  'Radiologist',
  'Anesthesiologist',
  'Oncologist',
  'Urologist',
  'Others',
];

export const OnboardingScreen: React.FC = () => {
  const navigation = useNavigation();
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [specializationPickerVisible, setSpecializationPickerVisible] = useState(false);
  const [form, setForm] = useState({
    name: '', bio: '', specialization: '', otherSpecialization: '', contactInfo: '',
    homeVisitEnabled: false, consultationFeeHomeVisit: '',
    doctorPlaceVisitEnabled: false, consultationFeeDoctorPlace: '',
    videoConsultationEnabled: true, consultationFeeVideoConsultation: '500',
    serviceRadius: '10',
  });

  const update = (key: string, value: any) => setForm((f) => ({ ...f, [key]: value }));

  const effectiveSpecialization =
    form.specialization === 'Others' ? form.otherSpecialization : form.specialization;

  const handleSubmit = async () => {
    if (!form.name || !effectiveSpecialization) { Alert.alert('Required', 'Name and specialization are required'); return; }
    setLoading(true);
    try {
      await providerService.onboard({
        name: form.name, bio: form.bio, specialization: effectiveSpecialization,
        contactInfo: form.contactInfo || user?.phone || '',
        homeVisitEnabled: form.homeVisitEnabled,
        consultationFeeHomeVisit: parseFloat(form.consultationFeeHomeVisit) || 0,
        doctorPlaceVisitEnabled: form.doctorPlaceVisitEnabled,
        consultationFeeDoctorPlace: parseFloat(form.consultationFeeDoctorPlace) || 0,
        videoConsultationEnabled: form.videoConsultationEnabled,
        consultationFeeVideoConsultation: parseFloat(form.consultationFeeVideoConsultation) || 500,
        serviceRadius: parseFloat(form.serviceRadius) || 10,
      });
      queryClient.invalidateQueries({ queryKey: ['provider-profile'] });
      Alert.alert('Success', 'Profile created! You can now receive bookings after verification.', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch (e: any) {
      Alert.alert('Error', e?.response?.data?.error || 'Failed to create profile');
    } finally { setLoading(false); }
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.steps}>
        {[1, 2, 3].map((s) => (
          <View key={s} style={[styles.stepDot, s <= step && styles.stepDotActive]}>
            <Text style={[styles.stepNum, s <= step && styles.stepNumActive]}>{s}</Text>
          </View>
        ))}
      </View>

      {step === 1 && (
        <View style={styles.stepContent}>
          <Text style={styles.stepTitle}>Personal Information</Text>
          <Input label="Full Name *" value={form.name} onChangeText={(t) => update('name', t)} placeholder="Dr. John Smith" />
          <Text style={styles.fieldLabel}>Specialization *</Text>
          <TouchableOpacity
            style={styles.dropdownBtn}
            onPress={() => setSpecializationPickerVisible(true)}
          >
            <Text style={[styles.dropdownText, !form.specialization && styles.dropdownPlaceholder]}>
              {form.specialization || 'Select specialization…'}
            </Text>
            <Text style={styles.dropdownArrow}>▾</Text>
          </TouchableOpacity>
          {form.specialization === 'Others' && (
            <Input
              label="Enter your specialization"
              value={form.otherSpecialization}
              onChangeText={(t) => update('otherSpecialization', t)}
              placeholder="e.g. Sports Medicine"
            />
          )}
          <Modal
            visible={specializationPickerVisible}
            transparent
            animationType="slide"
            onRequestClose={() => setSpecializationPickerVisible(false)}
          >
            <TouchableOpacity
              style={styles.modalOverlay}
              activeOpacity={1}
              onPress={() => setSpecializationPickerVisible(false)}
            >
              <View style={styles.modalSheet}>
                <Text style={styles.modalTitle}>Select Specialization</Text>
                <FlatList
                  data={SPECIALIZATIONS}
                  keyExtractor={(item) => item}
                  renderItem={({ item }) => (
                    <TouchableOpacity
                      style={[styles.modalItem, form.specialization === item && styles.modalItemActive]}
                      onPress={() => {
                        update('specialization', item);
                        if (item !== 'Others') update('otherSpecialization', '');
                        setSpecializationPickerVisible(false);
                      }}
                    >
                      <Text style={[styles.modalItemText, form.specialization === item && styles.modalItemTextActive]}>
                        {item}
                      </Text>
                    </TouchableOpacity>
                  )}
                />
              </View>
            </TouchableOpacity>
          </Modal>
          <Input label="Bio" value={form.bio} onChangeText={(t) => update('bio', t)} placeholder="Brief description..." multiline numberOfLines={4} style={{ height: 100, textAlignVertical: 'top' } as any} />
          <Input label="Contact Info *" value={form.contactInfo} onChangeText={(t) => update('contactInfo', t)} placeholder="Phone or email" />
          <Button title="Next →" onPress={() => setStep(2)} disabled={!form.name || !effectiveSpecialization} />
        </View>
      )}

      {step === 2 && (
        <View style={styles.stepContent}>
          <Text style={styles.stepTitle}>Service Settings</Text>
          <View style={styles.toggleRow}>
            <Toggle value={form.homeVisitEnabled} onToggle={() => update('homeVisitEnabled', !form.homeVisitEnabled)} label="🏠 Home Visit" />
          </View>
          {form.homeVisitEnabled && (
            <Input label="Home Visit Fee (₹)" value={form.consultationFeeHomeVisit} onChangeText={(t) => update('consultationFeeHomeVisit', t)} keyboardType="numeric" placeholder="500" />
          )}
          <View style={[styles.toggleRow, { marginTop: 16 }]}>
            <Toggle value={form.doctorPlaceVisitEnabled} onToggle={() => update('doctorPlaceVisitEnabled', !form.doctorPlaceVisitEnabled)} label="🏥 Clinic Visit" />
          </View>
          {form.doctorPlaceVisitEnabled && (
            <Input label="Clinic Fee (₹)" value={form.consultationFeeDoctorPlace} onChangeText={(t) => update('consultationFeeDoctorPlace', t)} keyboardType="numeric" placeholder="300" />
          )}
          <View style={[styles.toggleRow, { marginTop: 16 }]}>
            <Toggle value={form.videoConsultationEnabled} onToggle={() => update('videoConsultationEnabled', !form.videoConsultationEnabled)} label="📹 Video Consultation" />
          </View>
          {form.videoConsultationEnabled && (
            <Input label="Video Consultation Fee (₹)" value={form.consultationFeeVideoConsultation} onChangeText={(t) => update('consultationFeeVideoConsultation', t)} keyboardType="numeric" placeholder="400" />
          )}
          <Input label="Service Radius (km)" value={form.serviceRadius} onChangeText={(t) => update('serviceRadius', t)} keyboardType="numeric" placeholder="10" />
          <View style={styles.btnRow}>
            <Button title="← Back" onPress={() => setStep(1)} variant="outline" style={{ flex: 1 }} />
            <Button title="Next →" onPress={() => setStep(3)} style={{ flex: 1 }} />
          </View>
        </View>
      )}

      {step === 3 && (
        <View style={styles.stepContent}>
          <Text style={styles.stepTitle}>Review & Submit</Text>
          <View style={styles.reviewItem}><Text style={styles.reviewLabel}>Name</Text><Text style={styles.reviewValue}>{form.name}</Text></View>
          <View style={styles.reviewItem}><Text style={styles.reviewLabel}>Specialization</Text><Text style={styles.reviewValue}>{effectiveSpecialization}</Text></View>
          <View style={styles.reviewItem}><Text style={styles.reviewLabel}>Home Visit</Text><Text style={styles.reviewValue}>{form.homeVisitEnabled ? `Yes — ₹${form.consultationFeeHomeVisit}` : 'No'}</Text></View>
          <View style={styles.reviewItem}><Text style={styles.reviewLabel}>Clinic Visit</Text><Text style={styles.reviewValue}>{form.doctorPlaceVisitEnabled ? `Yes — ₹${form.consultationFeeDoctorPlace}` : 'No'}</Text></View>
          <View style={styles.reviewItem}><Text style={styles.reviewLabel}>Video Consult</Text><Text style={styles.reviewValue}>{form.videoConsultationEnabled ? `Yes — ₹${form.consultationFeeVideoConsultation}` : 'No'}</Text></View>
          <View style={styles.reviewItem}><Text style={styles.reviewLabel}>Service Radius</Text><Text style={styles.reviewValue}>{form.serviceRadius} km</Text></View>
          <View style={styles.btnRow}>
            <Button title="← Back" onPress={() => setStep(2)} variant="outline" style={{ flex: 1 }} />
            <Button title="Submit" onPress={handleSubmit} loading={loading} style={{ flex: 1 }} />
          </View>
        </View>
      )}
    </ScrollView>
  );
};
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  steps: { flexDirection: 'row', justifyContent: 'center', padding: 20, gap: 16 },
  stepDot: { width: 36, height: 36, borderRadius: 18, backgroundColor: Colors.border, alignItems: 'center', justifyContent: 'center' },
  stepDotActive: { backgroundColor: Colors.primary },
  stepNum: { fontSize: 16, fontWeight: '700', color: Colors.textMuted },
  stepNumActive: { color: Colors.white },
  stepContent: { padding: 20 },
  stepTitle: { fontSize: 22, fontWeight: '800', color: Colors.text, marginBottom: 20 },
  toggleRow: { backgroundColor: Colors.white, borderRadius: 10, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: Colors.border },
  btnRow: { flexDirection: 'row', gap: 12, marginTop: 12 },
  reviewItem: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: Colors.border },
  reviewLabel: { fontSize: 14, color: Colors.textMuted },
  reviewValue: { fontSize: 14, fontWeight: '600', color: Colors.text },
  fieldLabel: { fontSize: 14, fontWeight: '600', color: Colors.text, marginBottom: 6, marginTop: 4 },
  dropdownBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    borderWidth: 1, borderColor: Colors.border, borderRadius: 8,
    paddingHorizontal: 14, paddingVertical: 12, backgroundColor: Colors.white, marginBottom: 12,
  },
  dropdownText: { fontSize: 15, color: Colors.text },
  dropdownPlaceholder: { color: Colors.textMuted },
  dropdownArrow: { fontSize: 16, color: Colors.textMuted },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  modalSheet: { backgroundColor: Colors.white, borderTopLeftRadius: 20, borderTopRightRadius: 20, paddingTop: 16, paddingBottom: 32, maxHeight: '70%' },
  modalTitle: { fontSize: 17, fontWeight: '700', color: Colors.text, textAlign: 'center', marginBottom: 12 },
  modalItem: { paddingHorizontal: 20, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: Colors.border },
  modalItemActive: { backgroundColor: Colors.primaryLight },
  modalItemText: { fontSize: 15, color: Colors.text },
  modalItemTextActive: { fontWeight: '700', color: Colors.primary },
});
