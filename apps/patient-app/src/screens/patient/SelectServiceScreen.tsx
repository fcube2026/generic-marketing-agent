import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import { Colors } from '../../constants/colors';
import { Button } from '../../components/common/Button';
import { Input } from '../../components/common/Input';
import { getCurrentLocation } from '../../utils/location';
import { PatientStackParamList } from '../../navigation/PatientNavigator';
import { useBookingStore } from '../../store/bookingStore';

type Props = {
  navigation: NativeStackNavigationProp<PatientStackParamList, 'SelectService'>;
  route: RouteProp<PatientStackParamList, 'SelectService'>;
};

export const SelectServiceScreen: React.FC<Props> = ({ navigation, route }) => {
  const { category } = route.params;
  const [symptoms, setSymptoms] = useState('');
  const [timing, setTiming] = useState<'now' | 'later'>('now');
  const [loading, setLoading] = useState(false);
  const { setSelectedService, setSymptoms: storeSetSymptoms } = useBookingStore();

  const handleFindProviders = async () => {
    setLoading(true);
    try {
      const location = await getCurrentLocation();
      if (!location) {
        Alert.alert(
          'Location Required',
          'Please enable location services to find nearby providers.'
        );
        return;
      }

      setSelectedService(category);
      storeSetSymptoms(symptoms);

      navigation.navigate('ProviderList', {
        categoryId: category.id,
        categorySlug: category.slug,
        lat: location.lat,
        lng: location.lng,
      });
    } catch {
      Alert.alert('Error', 'Failed to get your location. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.selectedService}>
        <Text style={styles.selectedLabel}>Selected Service</Text>
        <Text style={styles.selectedName}>{category.name}</Text>
        {category.description && (
          <Text style={styles.selectedDesc}>{category.description}</Text>
        )}
      </View>

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
              if (loc) {
                navigation.navigate('Recommendation', {
                  categorySlug: category.slug,
                  lat: loc.lat,
                  lng: loc.lng,
                });
              }
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
});
