import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Colors } from '../../constants/colors';
import { Button } from '../../components/common/Button';
import { Input } from '../../components/common/Input';
import { Toggle } from '../../components/common/Toggle';
import { providerService } from '../../services/providerService';
import { serviceService } from '../../services/serviceService';
import { ServiceCategory } from '../../types';

export const OnboardingScreen: React.FC = () => {
  const navigation = useNavigation();
  const queryClient = useQueryClient();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<string[]>([]);
  const [form, setForm] = useState({
    name: '', bio: '', specialization: '',
    homeVisitEnabled: false, consultationFeeHomeVisit: '',
    doctorPlaceVisitEnabled: false, consultationFeeDoctorPlace: '',
    serviceRadius: '10',
  });

  const {
    data: categories,
    isLoading: categoriesLoading,
    isError: categoriesError,
    refetch: refetchCategories,
  } = useQuery<ServiceCategory[]>({
    queryKey: ['services'],
    queryFn: serviceService.getCategories,
  });

  const update = (key: string, value: any) => setForm((f) => ({ ...f, [key]: value }));

  const toggleCategory = (id: string) => {
    setSelectedCategoryIds((prev) =>
      prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id],
    );
  };

  const handleSubmit = async () => {
    if (!form.name || !form.specialization) { Alert.alert('Required', 'Name and specialization are required'); return; }
    setLoading(true);
    try {
      await providerService.onboard({
        name: form.name, bio: form.bio, specialization: form.specialization,
        homeVisitEnabled: form.homeVisitEnabled,
        consultationFeeHomeVisit: parseFloat(form.consultationFeeHomeVisit) || 0,
        doctorPlaceVisitEnabled: form.doctorPlaceVisitEnabled,
        consultationFeeDoctorPlace: parseFloat(form.consultationFeeDoctorPlace) || 0,
        serviceRadius: parseFloat(form.serviceRadius) || 10,
        serviceCategoryIds: selectedCategoryIds,
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
          <Input label="Specialization *" value={form.specialization} onChangeText={(t) => update('specialization', t)} placeholder="General Physician" />
          <Input label="Bio" value={form.bio} onChangeText={(t) => update('bio', t)} placeholder="Brief description..." multiline numberOfLines={4} style={{ height: 100, textAlignVertical: 'top' } as any} />

          <Text style={styles.categoryLabel}>Service Categories</Text>
          {categoriesLoading ? (
            <Text style={styles.categoryHint}>Loading categories...</Text>
          ) : categoriesError ? (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>Unable to load categories</Text>
              <TouchableOpacity style={styles.retryButton} onPress={() => refetchCategories()}>
                <Text style={styles.retryText}>Tap to retry</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.categoryGrid}>
              {(categories || []).map((cat) => {
                const selected = selectedCategoryIds.includes(cat.id);
                return (
                  <TouchableOpacity
                    key={cat.id}
                    style={[styles.categoryChip, selected && styles.categoryChipSelected]}
                    onPress={() => toggleCategory(cat.id)}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.categoryChipText, selected && styles.categoryChipTextSelected]}>
                      {cat.name}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}

          <Button title="Next →" onPress={() => setStep(2)} disabled={!form.name || !form.specialization} />
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
          <View style={styles.reviewItem}><Text style={styles.reviewLabel}>Specialization</Text><Text style={styles.reviewValue}>{form.specialization}</Text></View>
          <View style={styles.reviewItem}>
            <Text style={styles.reviewLabel}>Services</Text>
            <Text style={styles.reviewValue}>
              {selectedCategoryIds.length > 0
                ? (categories || []).filter((c) => selectedCategoryIds.includes(c.id)).map((c) => c.name).join(', ')
                : 'None selected'}
            </Text>
          </View>
          <View style={styles.reviewItem}><Text style={styles.reviewLabel}>Home Visit</Text><Text style={styles.reviewValue}>{form.homeVisitEnabled ? `Yes — ₹${form.consultationFeeHomeVisit}` : 'No'}</Text></View>
          <View style={styles.reviewItem}><Text style={styles.reviewLabel}>Clinic Visit</Text><Text style={styles.reviewValue}>{form.doctorPlaceVisitEnabled ? `Yes — ₹${form.consultationFeeDoctorPlace}` : 'No'}</Text></View>
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
  reviewValue: { fontSize: 14, fontWeight: '600', color: Colors.text, flexShrink: 1, textAlign: 'right' },
  categoryLabel: { fontSize: 15, fontWeight: '600', color: Colors.text, marginTop: 16, marginBottom: 8 },
  categoryHint: { fontSize: 13, color: Colors.textMuted, marginBottom: 12 },
  categoryGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  categoryChip: {
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20,
    backgroundColor: Colors.white, borderWidth: 1, borderColor: Colors.border,
  },
  categoryChipSelected: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  categoryChipText: { fontSize: 13, color: Colors.text },
  categoryChipTextSelected: { color: Colors.white, fontWeight: '600' },
  errorContainer: { alignItems: 'center', padding: 16, backgroundColor: Colors.white, borderRadius: 12, marginBottom: 12 },
  errorText: { fontSize: 14, color: Colors.error, marginBottom: 8 },
  retryButton: { paddingHorizontal: 16, paddingVertical: 8, backgroundColor: Colors.primary, borderRadius: 8 },
  retryText: { color: Colors.white, fontWeight: '600', fontSize: 13 },
});
