import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import * as Location from 'expo-location';
import { Colors } from '../../../constants/colors';
import { Input } from '../../../components/common/Input';
import { Button } from '../../../components/common/Button';
import { verificationService } from '../../../services/verificationService';
import { PatientStackParamList } from '../../../navigation/PatientNavigator';
import { usePatientKycDraft } from '../../../state/patientKycDraft';

type Nav = NativeStackNavigationProp<PatientStackParamList, 'PatientKycAddress'>;
type Props = { navigation: Nav };

type Mode = 'MANUAL' | 'MAP';

export const PatientKycAddressScreen: React.FC<Props> = ({ navigation }) => {
  const qc = useQueryClient();
  const [mode, setMode] = useState<Mode>('MANUAL');
  // Pre-fill address from the Aadhaar OCR draft when available — every
  // field stays editable, the draft is only a hint.
  const ocrDraft = usePatientKycDraft((s) => s.ocr);
  const [addressLine, setAddressLine] = useState(ocrDraft?.address ?? '');
  const [city, setCity] = useState('');
  const [stateName, setStateName] = useState('');
  const [pincode, setPincode] = useState('');
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [formatted, setFormatted] = useState<string | null>(null);
  const [fetchingLocation, setFetchingLocation] = useState(false);

  const fetchFromMaps = async () => {
    setFetchingLocation(true);
    try {
      const perm = await Location.requestForegroundPermissionsAsync();
      if (perm.status !== 'granted') {
        Alert.alert(
          'Location permission required',
          'Please enable location access to fetch your address from maps.',
        );
        return;
      }
      const loc = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      const { latitude, longitude } = loc.coords;
      setCoords({ lat: latitude, lng: longitude });
      try {
        const reverse = await Location.reverseGeocodeAsync({
          latitude,
          longitude,
        });
        const r = reverse[0];
        if (r) {
          setFormatted(
            [r.name, r.street, r.city, r.region, r.postalCode]
              .filter(Boolean)
              .join(', '),
          );
        }
      } catch {
        // reverse-geocode is best-effort; coords alone are enough
      }
    } catch {
      Alert.alert('Could not fetch location', 'Please try again or enter manually.');
    } finally {
      setFetchingLocation(false);
    }
  };

  const mutation = useMutation({
    mutationFn: () =>
      verificationService.selfSubmitAddress(
        mode === 'MANUAL'
          ? {
              source: 'MANUAL',
              addressLine: addressLine.trim(),
              city: city.trim(),
              state: stateName.trim(),
              pincode: pincode.trim(),
            }
          : {
              source: 'MAP',
              lat: coords!.lat,
              lng: coords!.lng,
              formatted: formatted ?? undefined,
            },
      ),
    onSuccess: (data) => {
      qc.setQueryData(['patient-kyc-status'], data);
      qc.invalidateQueries({ queryKey: ['patient-kyc-status'] });
      navigation.navigate('PatientKycIdUpload');
    },
    onError: (err: any) => {
      Alert.alert(
        'Could not save address',
        err?.response?.data?.message || 'Please check your inputs and try again.',
      );
    },
  });

  const manualValid =
    !!addressLine.trim() && !!city.trim() && !!stateName.trim() && !!pincode.trim();
  const mapValid = !!coords;
  const isValid = mode === 'MANUAL' ? manualValid : mapValid;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.step}>Step 3 of 5</Text>
      <Text style={styles.title}>Your Address</Text>
      <Text style={styles.subtitle}>
        Enter your residential address manually or fetch it from your current
        location. Either is fine.
      </Text>

      <View style={styles.tabs}>
        <TouchableOpacity
          style={[styles.tab, mode === 'MANUAL' && styles.tabActive]}
          onPress={() => setMode('MANUAL')}
        >
          <Text style={[styles.tabText, mode === 'MANUAL' && styles.tabTextActive]}>
            Enter manually
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, mode === 'MAP' && styles.tabActive]}
          onPress={() => setMode('MAP')}
        >
          <Text style={[styles.tabText, mode === 'MAP' && styles.tabTextActive]}>
            From maps
          </Text>
        </TouchableOpacity>
      </View>

      {mode === 'MANUAL' ? (
        <>
          <Input
            label="Address Line"
            placeholder="House / street / area"
            value={addressLine}
            onChangeText={setAddressLine}
          />
          <Input label="City" value={city} onChangeText={setCity} />
          <Input label="State" value={stateName} onChangeText={setStateName} />
          <Input
            label="Pincode"
            value={pincode}
            onChangeText={setPincode}
            keyboardType="number-pad"
            maxLength={10}
          />
        </>
      ) : (
        <View style={styles.mapBlock}>
          <Button
            title={coords ? 'Refresh location' : 'Use my current location'}
            onPress={fetchFromMaps}
            variant="outline"
            loading={fetchingLocation}
          />
          {fetchingLocation && (
            <ActivityIndicator style={{ marginTop: 12 }} color={Colors.primary} />
          )}
          {coords && (
            <View style={styles.mapResult}>
              <Text style={styles.mapResultTitle}>📍 Location captured</Text>
              <Text style={styles.mapResultText}>
                {coords.lat.toFixed(5)}, {coords.lng.toFixed(5)}
              </Text>
              {formatted && <Text style={styles.mapResultText}>{formatted}</Text>}
            </View>
          )}
        </View>
      )}

      <View style={styles.footer}>
        <Button
          title="Continue"
          onPress={() => mutation.mutate()}
          disabled={!isValid}
          loading={mutation.isPending}
        />
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { padding: 20, paddingBottom: 40 },
  step: { fontSize: 12, color: Colors.textMuted, fontWeight: '700', marginBottom: 4 },
  title: { fontSize: 24, fontWeight: '800', color: Colors.text, marginBottom: 6 },
  subtitle: { fontSize: 14, color: Colors.textMuted, marginBottom: 20, lineHeight: 20 },
  tabs: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  tab: {
    flex: 1,
    paddingVertical: 12,
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderRadius: 10,
    alignItems: 'center',
    backgroundColor: Colors.white,
  },
  tabActive: { borderColor: Colors.primary, backgroundColor: Colors.primaryLight },
  tabText: { fontSize: 14, fontWeight: '600', color: Colors.textMuted },
  tabTextActive: { color: Colors.primary },
  mapBlock: { marginBottom: 8 },
  mapResult: {
    marginTop: 16,
    padding: 14,
    backgroundColor: Colors.white,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  mapResultTitle: { fontSize: 14, fontWeight: '700', color: Colors.text, marginBottom: 4 },
  mapResultText: { fontSize: 13, color: Colors.textMuted, marginTop: 2 },
  footer: { marginTop: 16 },
});
