import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Switch, TextInput,
  TouchableOpacity, Alert, SafeAreaView,
} from 'react-native';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Colors } from '../../constants/colors';
import { providerService } from '../../services/providerService';
import { getCurrentLocation } from '../../utils/location';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

type DaySchedule = { enabled: boolean; start: string; end: string };

export const AvailabilityScreen: React.FC = () => {
  const queryClient = useQueryClient();
  const [isAvailable, setIsAvailable] = useState(false);
  const [homeVisit, setHomeVisit] = useState(false);
  const [homeVisitFee, setHomeVisitFee] = useState('');
  const [doctorPlace, setDoctorPlace] = useState(false);
  const [doctorPlaceFee, setDoctorPlaceFee] = useState('');
  const [videoConsultation, setVideoConsultation] = useState(false);
  const [videoConsultationFee, setVideoConsultationFee] = useState('');
  const [serviceRadius, setServiceRadius] = useState(10);
  const [saving, setSaving] = useState(false);
  const [schedule, setSchedule] = useState<Record<string, DaySchedule>>(
    Object.fromEntries(DAYS.map(d => [d, { enabled: false, start: '09:00', end: '18:00' }]))
  );

  const { data: profile } = useQuery({
    queryKey: ['provider-profile'],
    queryFn: providerService.getProfile,
  });

  // Populate state from saved profile so toggles persist across sessions
  useEffect(() => {
    if (!profile) return;
    setIsAvailable(profile.isAvailable ?? false);
    setHomeVisit(profile.homeVisitEnabled ?? false);
    setHomeVisitFee(profile.consultationFeeHomeVisit ? String(profile.consultationFeeHomeVisit) : '');
    setDoctorPlace(profile.doctorPlaceVisitEnabled ?? false);
    setDoctorPlaceFee(profile.consultationFeeDoctorPlace ? String(profile.consultationFeeDoctorPlace) : '');
    setVideoConsultation(profile.videoConsultationEnabled ?? false);
    setVideoConsultationFee(profile.consultationFeeVideoConsultation ? String(profile.consultationFeeVideoConsultation) : '');
    setServiceRadius(profile.serviceRadius ?? 10);
  }, [profile]);

  const updateDay = (day: string, field: keyof DaySchedule, value: boolean | string) => {
    setSchedule(prev => ({ ...prev, [day]: { ...prev[day], [field]: value } }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await providerService.updateProfile({
        homeVisitEnabled: homeVisit,
        consultationFeeHomeVisit: parseFloat(homeVisitFee) || 0,
        doctorPlaceVisitEnabled: doctorPlace,
        consultationFeeDoctorPlace: parseFloat(doctorPlaceFee) || 0,
        videoConsultationEnabled: videoConsultation,
        consultationFeeVideoConsultation: parseFloat(videoConsultationFee) || 0,
        serviceRadius,
      });

      const location = isAvailable ? await getCurrentLocation() : null;
      await providerService.updateAvailability(
        isAvailable,
        location?.lat,
        location?.lng,
      );

      queryClient.invalidateQueries({ queryKey: ['provider-profile'] });
      Alert.alert('Saved', 'Availability settings updated.');
    } catch {
      Alert.alert('Error', 'Failed to save settings.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        {/* Master toggle */}
        <View style={[styles.availCard, { backgroundColor: isAvailable ? Colors.primary : Colors.border }]}>
          <Text style={styles.availLabel}>{isAvailable ? '🟢 Available for Bookings' : '🔴 Not Available'}</Text>
          <Switch
            value={isAvailable}
            onValueChange={setIsAvailable}
            trackColor={{ true: Colors.primaryDark, false: '#ccc' }}
            thumbColor={Colors.white}
          />
        </View>

        {/* Service Modes */}
        <Text style={styles.sectionTitle}>Service Modes</Text>
        <View style={styles.card}>
          <View style={styles.modeRow}>
            <View>
              <Text style={styles.modeLabel}>🏠 Home Visit</Text>
              <Text style={styles.modeNote}>You travel to patient</Text>
            </View>
            <Switch value={homeVisit} onValueChange={setHomeVisit} trackColor={{ true: Colors.primary }} />
          </View>
          {homeVisit && (
            <View style={styles.feeRow}>
              <Text style={styles.feeLabel}>Consultation Fee (₹)</Text>
              <TextInput
                style={styles.feeInput}
                value={homeVisitFee}
                onChangeText={setHomeVisitFee}
                keyboardType="numeric"
                placeholder="e.g. 500"
              />
            </View>
          )}
        </View>

        <View style={styles.card}>
          <View style={styles.modeRow}>
            <View>
              <Text style={styles.modeLabel}>🏥 Doctor's Place</Text>
              <Text style={styles.modeNote}>Patient visits your clinic</Text>
            </View>
            <Switch value={doctorPlace} onValueChange={setDoctorPlace} trackColor={{ true: Colors.primary }} />
          </View>
          {doctorPlace && (
            <View style={styles.feeRow}>
              <Text style={styles.feeLabel}>Consultation Fee (₹)</Text>
              <TextInput
                style={styles.feeInput}
                value={doctorPlaceFee}
                onChangeText={setDoctorPlaceFee}
                keyboardType="numeric"
                placeholder="e.g. 300"
              />
            </View>
          )}
        </View>

        <View style={styles.card}>
          <View style={styles.modeRow}>
            <View>
              <Text style={styles.modeLabel}>📹 Video Consultation</Text>
              <Text style={styles.modeNote}>Remote video call</Text>
            </View>
            <Switch value={videoConsultation} onValueChange={setVideoConsultation} trackColor={{ true: Colors.primary }} />
          </View>
          {videoConsultation && (
            <View style={styles.feeRow}>
              <Text style={styles.feeLabel}>Consultation Fee (₹)</Text>
              <TextInput
                style={styles.feeInput}
                value={videoConsultationFee}
                onChangeText={setVideoConsultationFee}
                keyboardType="numeric"
                placeholder="e.g. 500"
              />
            </View>
          )}
        </View>

        {/* Service Radius */}
        <Text style={styles.sectionTitle}>Service Radius</Text>
        <View style={styles.card}>
          <Text style={styles.radiusText}>{serviceRadius} km</Text>
          <View style={styles.radiusButtons}>
            {[5, 10, 15, 20, 30, 50].map(r => (
              <TouchableOpacity
                key={r}
                style={[styles.radiusChip, serviceRadius === r && styles.radiusChipActive]}
                onPress={() => setServiceRadius(r)}
              >
                <Text style={[styles.radiusChipText, serviceRadius === r && styles.radiusChipTextActive]}>
                  {r}km
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Working Hours */}
        <Text style={styles.sectionTitle}>Working Hours</Text>
        {DAYS.map(day => (
          <View key={day} style={styles.dayCard}>
            <View style={styles.dayHeader}>
              <Text style={styles.dayName}>{day}</Text>
              <Switch
                value={schedule[day].enabled}
                onValueChange={v => updateDay(day, 'enabled', v)}
                trackColor={{ true: Colors.primary }}
              />
            </View>
            {schedule[day].enabled && (
              <View style={styles.timeRow}>
                <View style={styles.timeField}>
                  <Text style={styles.timeLabel}>Start</Text>
                  <TextInput
                    style={styles.timeInput}
                    value={schedule[day].start}
                    onChangeText={v => updateDay(day, 'start', v)}
                    placeholder="09:00"
                  />
                </View>
                <Text style={styles.timeSep}>–</Text>
                <View style={styles.timeField}>
                  <Text style={styles.timeLabel}>End</Text>
                  <TextInput
                    style={styles.timeInput}
                    value={schedule[day].end}
                    onChangeText={v => updateDay(day, 'end', v)}
                    placeholder="18:00"
                  />
                </View>
              </View>
            )}
          </View>
        ))}

        <TouchableOpacity
          style={[styles.saveBtn, saving && { opacity: 0.7 }]}
          onPress={handleSave}
          disabled={saving}
        >
          <Text style={styles.saveBtnText}>{saving ? 'Saving…' : 'Save Settings'}</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { padding: 16, paddingBottom: 40 },
  availCard: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    borderRadius: 12, padding: 20, marginBottom: 20,
  },
  availLabel: { color: Colors.white, fontSize: 18, fontWeight: '700' },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: Colors.text, marginBottom: 8, marginTop: 16 },
  card: { backgroundColor: Colors.card, borderRadius: 12, padding: 16, marginBottom: 12, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 4, elevation: 2 },
  modeRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  modeLabel: { fontSize: 16, fontWeight: '600', color: Colors.text },
  modeNote: { fontSize: 12, color: Colors.textMuted, marginTop: 2 },
  feeRow: { marginTop: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  feeLabel: { fontSize: 14, color: Colors.text },
  feeInput: { borderWidth: 1, borderColor: Colors.border, borderRadius: 8, padding: 8, width: 120, textAlign: 'right' },
  radiusText: { fontSize: 22, fontWeight: '700', color: Colors.primary, textAlign: 'center', marginBottom: 12 },
  radiusButtons: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  radiusChip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1, borderColor: Colors.border },
  radiusChipActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  radiusChipText: { color: Colors.text },
  radiusChipTextActive: { color: Colors.white, fontWeight: '600' },
  dayCard: { backgroundColor: Colors.card, borderRadius: 10, padding: 14, marginBottom: 8, elevation: 1 },
  dayHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  dayName: { fontSize: 15, fontWeight: '600', color: Colors.text },
  timeRow: { flexDirection: 'row', alignItems: 'center', marginTop: 10 },
  timeField: { flex: 1 },
  timeLabel: { fontSize: 12, color: Colors.textMuted, marginBottom: 4 },
  timeInput: { borderWidth: 1, borderColor: Colors.border, borderRadius: 8, padding: 8 },
  timeSep: { marginHorizontal: 12, fontSize: 18, color: Colors.textMuted },
  saveBtn: { backgroundColor: Colors.primary, borderRadius: 12, padding: 16, alignItems: 'center', marginTop: 24 },
  saveBtnText: { color: Colors.white, fontSize: 16, fontWeight: '700' },
});
