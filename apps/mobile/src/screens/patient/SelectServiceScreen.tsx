import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Platform,
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import { Colors } from '../../constants/colors';
import { Button } from '../../components/common/Button';
import { Input } from '../../components/common/Input';
import { getCurrentLocation, MOCK_LOCATION } from '../../utils/location';
import { PatientStackParamList } from '../../navigation/PatientNavigator';
import { useBookingStore } from '../../store/bookingStore';

type Props = {
  navigation: NativeStackNavigationProp<PatientStackParamList, 'SelectService'>;
  route: RouteProp<PatientStackParamList, 'SelectService'>;
};

// JS-only Time Slots Generator
const GENERATE_TIME_SLOTS = () => {
  const slots = [];
  for (let hour = 8; hour <= 21; hour++) {
    slots.push(`${hour % 12 || 12}:00 ${hour < 12 ? 'AM' : 'PM'}`);
    slots.push(`${hour % 12 || 12}:30 ${hour < 12 ? 'AM' : 'PM'}`);
  }
  return slots;
};

const TIME_SLOTS = GENERATE_TIME_SLOTS();

// Generate next 7 days
const GENERATE_DATE_SLOTS = () => {
  const dates = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date();
    d.setDate(d.getDate() + i);
    dates.push(d);
  }
  return dates;
};

const DATE_SLOTS = GENERATE_DATE_SLOTS();

export const SelectServiceScreen: React.FC<Props> = ({ navigation, route }) => {
  const { category } = route.params;
  const [mode, setMode] = useState<'HOME_VISIT' | 'DOCTOR_PLACE' | 'VIDEO_CONSULTATION' | null>(null);
  const [symptoms, setSymptoms] = useState('');
  const [timing, setTiming] = useState<'now' | 'later'>('now');
  
  // Internal state for JS-only picker
  const [selectedDate, setSelectedDate] = useState(DATE_SLOTS[0]);
  const [selectedHour, setSelectedHour] = useState(10);
  const [selectedMinute, setSelectedMinute] = useState(0);
  const [selectedAmPm, setSelectedAmPm] = useState<'AM' | 'PM'>('AM');
  
  const [loading, setLoading] = useState(false);
  
  const { 
    setSelectedService, 
    setSelectedMode, 
    setSymptoms: storeSetSymptoms,
    setScheduledAt: storeSetScheduledAt
  } = useBookingStore();

  const handleFindProviders = async () => {
    if (!mode) {
      Alert.alert('Selection Required', 'Please select a consultation type.');
      return;
    }
    setLoading(true);
    try {
      setSelectedService(category);
      setSelectedMode(mode);
      storeSetSymptoms(symptoms);

      // Construct Date object from selection
      if (timing === 'later') {
        const finalDate = new Date(selectedDate);
        let hour = selectedHour;
        if (selectedAmPm === 'PM' && hour !== 12) hour += 12;
        if (selectedAmPm === 'AM' && hour === 12) hour = 0;

        finalDate.setHours(hour, selectedMinute, 0, 0);
        storeSetScheduledAt(finalDate);
      } else {
        storeSetScheduledAt(null);
      }

      // Video consultations don't require location; Home/Clinic do.
      if (mode === 'VIDEO_CONSULTATION') {
        navigation.navigate('ProviderList', {
          categoryId: category.id,
          serviceId: category.id,
          categorySlug: category.slug,
          mode,
        });
      } else {
        const location = await getCurrentLocation();
        const resolvedLocation = location ?? MOCK_LOCATION;
        navigation.navigate('ProviderList', {
          categoryId: category.id,
          serviceId: category.id,
          categorySlug: category.slug,
          mode,
          lat: resolvedLocation.lat,
          lng: resolvedLocation.lng,
        });
      }
    } catch {
      Alert.alert('Error', 'Failed to get your location. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const adjustTime = (type: 'hour' | 'minute', amount: number) => {
    if (type === 'hour') {
      let next = selectedHour + amount;
      if (next > 12) next = 1;
      if (next < 1) next = 12;
      setSelectedHour(next);
    } else {
      let next = selectedMinute + amount;
      if (next >= 60) next = 0;
      if (next < 0) next = 59;
      setSelectedMinute(next);
    }
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.selectedService}>
        <Text style={styles.selectedLabel}>Selected Service</Text>
        <Text style={styles.selectedName}>{category.name}</Text>
        {category.description && (
          <Text style={styles.selectedDesc}>{category.description}</Text>
        )}
      </View>

      {/* Consultation Type */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Select Consultation Type</Text>
        <View style={styles.modeRow}>
          <TouchableOpacity
            style={[styles.modeBtn, mode === 'HOME_VISIT' && styles.modeBtnActive]}
            onPress={() => setMode('HOME_VISIT')}
          >
            <Text style={styles.modeIcon}>🏠</Text>
            <Text style={[styles.modeLabel, mode === 'HOME_VISIT' && styles.modeLabelActive]}>Home</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.modeBtn, mode === 'DOCTOR_PLACE' && styles.modeBtnActive]}
            onPress={() => setMode('DOCTOR_PLACE')}
          >
            <Text style={styles.modeIcon}>🏥</Text>
            <Text style={[styles.modeLabel, mode === 'DOCTOR_PLACE' && styles.modeLabelActive]}>Clinic</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.modeBtn, mode === 'VIDEO_CONSULTATION' && styles.modeBtnActive]}
            onPress={() => setMode('VIDEO_CONSULTATION')}
          >
            <Text style={styles.modeIcon}>📹</Text>
            <Text style={[styles.modeLabel, mode === 'VIDEO_CONSULTATION' && styles.modeLabelActive]}>Video</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Symptoms */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Describe your symptoms</Text>
        <Input
          placeholder="e.g., fever and headache for 2 days..."
          multiline
          numberOfLines={4}
          value={symptoms}
          onChangeText={setSymptoms}
          style={styles.symptomsInput as any}
        />
      </View>

      {/* Timing Selection */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>When do you need care?</Text>
        <View style={styles.timingRow}>
          <TouchableOpacity
            style={[styles.timingBtn, timing === 'now' && styles.timingBtnActive]}
            onPress={() => setTiming('now')}
          >
            <Text style={[styles.timingBtnText, timing === 'now' && styles.timingBtnTextActive]}>
              ⚡ Now
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.timingBtn, timing === 'later' && styles.timingBtnActive]}
            onPress={() => setTiming('later')}
          >
            <Text style={[styles.timingBtnText, timing === 'later' && styles.timingBtnTextActive]}>
              📅 Schedule Later
            </Text>
          </TouchableOpacity>
        </View>

        {timing === 'later' && (
          <View style={styles.customTimingContainer}>
            <Text style={styles.customTimingLabel}>Select Date</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.dateList}>
              {DATE_SLOTS.map((date, idx) => {
                const isSelected = selectedDate.toDateString() === date.toDateString();
                const isToday = idx === 0;
                return (
                  <TouchableOpacity 
                    key={idx} 
                    style={[styles.dateChip, isSelected && styles.dateChipActive]}
                    onPress={() => setSelectedDate(date)}
                  >
                    <Text style={[styles.dateChipDay, isSelected && styles.dateChipTextActive]}>
                      {isToday ? 'Today' : date.toLocaleDateString('en-US', { weekday: 'short' })}
                    </Text>
                    <Text style={[styles.dateChipNum, isSelected && styles.dateChipTextActive]}>
                      {date.getDate()}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            <Text style={[styles.customTimingLabel, { marginTop: 24 }]}>Set Time</Text>
            
            <View style={styles.clockContainer}>
              <View style={styles.clockDigitBox}>
                <TouchableOpacity onPress={() => adjustTime('hour', 1)} style={styles.clockArrow}>
                  <Text style={styles.clockArrowText}>▲</Text>
                </TouchableOpacity>
                <Text style={styles.clockDigit}>{selectedHour.toString().padStart(2, '0')}</Text>
                <TouchableOpacity onPress={() => adjustTime('hour', -1)} style={styles.clockArrow}>
                  <Text style={styles.clockArrowText}>▼</Text>
                </TouchableOpacity>
              </View>

              <Text style={styles.clockSeparator}>:</Text>

              <View style={styles.clockDigitBox}>
                <TouchableOpacity onPress={() => adjustTime('minute', 5)} style={styles.clockArrow}>
                  <Text style={styles.clockArrowText}>▲</Text>
                </TouchableOpacity>
                <Text style={styles.clockDigit}>{selectedMinute.toString().padStart(2, '0')}</Text>
                <TouchableOpacity onPress={() => adjustTime('minute', -5)} style={styles.clockArrow}>
                  <Text style={styles.clockArrowText}>▼</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.amPmContainer}>
                <TouchableOpacity 
                  style={[styles.amPmBtn, selectedAmPm === 'AM' && styles.amPmBtnActive]}
                  onPress={() => setSelectedAmPm('AM')}
                >
                  <Text style={[styles.amPmText, selectedAmPm === 'AM' && styles.amPmTextActive]}>AM</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[styles.amPmBtn, selectedAmPm === 'PM' && styles.amPmBtnActive]}
                  onPress={() => setSelectedAmPm('PM')}
                >
                  <Text style={[styles.amPmText, selectedAmPm === 'PM' && styles.amPmTextActive]}>PM</Text>
                </TouchableOpacity>
              </View>
            </View>

            <Text style={styles.clockHint}>Tap arrows to adjust hour & minute precisely</Text>
          </View>
        )}
      </View>

      <View style={styles.section}>
        <View style={styles.locationRow}>
          <Text style={styles.locationIcon}>📍</Text>
          <Text style={styles.locationText}>Using your current location</Text>
        </View>
      </View>

      <View style={styles.footer}>
        <Button
          title="Find Providers"
          onPress={handleFindProviders}
          loading={loading}
        />
        <Button
          title="Get Smart Recommendation"
          onPress={() => {
            getCurrentLocation().then((loc) => {
              const resolvedLoc = loc ?? MOCK_LOCATION;
              navigation.navigate('Recommendation', {
                categorySlug: category.slug,
                lat: resolvedLoc.lat,
                lng: resolvedLoc.lng,
              });
            });
          }}
          variant="outline"
          style={{ marginTop: 12 }}
        />
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  selectedService: {
    backgroundColor: Colors.primary,
    padding: 20,
    paddingTop: 16,
  },
  selectedLabel: { fontSize: 12, color: 'rgba(255,255,255,0.75)', textTransform: 'uppercase', letterSpacing: 1 },
  selectedName: { fontSize: 24, fontWeight: '800', color: Colors.white, marginTop: 4 },
  selectedDesc: { fontSize: 14, color: 'rgba(255,255,255,0.85)', marginTop: 6 },
  section: { padding: 20, paddingBottom: 0 },
  sectionTitle: { fontSize: 16, fontWeight: '600', color: Colors.text, marginBottom: 12 },
  symptomsInput: { textAlignVertical: 'top', height: 100 },
  modeRow: { flexDirection: 'row', gap: 12 },
  modeBtn: {
    flex: 1,
    backgroundColor: Colors.white,
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: Colors.border,
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
  },
  modeBtnActive: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primaryLight,
  },
  modeIcon: { fontSize: 28, marginBottom: 4 },
  modeLabel: { fontSize: 13, fontWeight: '700', color: Colors.textMuted },
  modeLabelActive: { color: Colors.primary },
  timingRow: { flexDirection: 'row', gap: 12 },
  timingBtn: {
    flex: 1,
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderRadius: 10,
    padding: 14,
    alignItems: 'center',
    backgroundColor: Colors.white,
  },
  timingBtnActive: { borderColor: Colors.primary, backgroundColor: Colors.primaryLight },
  timingBtnText: { fontSize: 15, fontWeight: '600', color: Colors.textMuted },
  timingBtnTextActive: { color: Colors.primary },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    borderRadius: 10,
    padding: 14,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: 8,
  },
  locationIcon: { fontSize: 18 },
  locationText: { fontSize: 14, color: Colors.text },
  footer: { padding: 20, paddingTop: 24 },
  customTimingContainer: {
    marginTop: 16,
    padding: 16,
    backgroundColor: Colors.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.primary + '33', // 20% opacity
  },
  customTimingLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.textMuted,
    marginBottom: 12,
    textTransform: 'uppercase',
  },
  dateTimeRow: {
    flexDirection: 'row',
    gap: 10,
  },
  dateList: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  dateChip: {
    backgroundColor: Colors.background,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    marginRight: 10,
    alignItems: 'center',
    minWidth: 70,
  },
  dateChipActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  dateChipDay: {
    fontSize: 12,
    color: Colors.textMuted,
    marginBottom: 4,
  },
  dateChipNum: {
    fontSize: 18,
    fontWeight: '800',
    color: Colors.text,
  },
  dateChipTextActive: {
    color: Colors.white,
  },
  clockContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.background,
    padding: 20,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: 15,
  },
  clockDigitBox: {
    alignItems: 'center',
    width: 60,
  },
  clockDigit: {
    fontSize: 40,
    fontWeight: '800',
    color: Colors.primary,
    marginVertical: 8,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  clockArrow: {
    padding: 10,
    backgroundColor: Colors.white,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.border,
    width: '100%',
    alignItems: 'center',
  },
  clockArrowText: {
    fontSize: 18,
    color: Colors.primary,
    fontWeight: '900',
  },
  clockSeparator: {
    fontSize: 32,
    fontWeight: '700',
    color: Colors.textMuted,
    marginTop: 10,
  },
  amPmContainer: {
    gap: 10,
    marginLeft: 10,
  },
  amPmBtn: {
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.white,
  },
  amPmBtnActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  amPmText: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.textMuted,
  },
  amPmTextActive: {
    color: Colors.white,
  },
  clockHint: {
    fontSize: 12,
    color: Colors.textMuted,
    marginTop: 16,
    textAlign: 'center',
    fontStyle: 'italic',
  },
});
