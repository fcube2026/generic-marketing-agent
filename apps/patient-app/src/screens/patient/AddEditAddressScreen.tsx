import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
  Switch,
  Platform,
} from 'react-native';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import * as Location from 'expo-location';
import { Colors } from '../../constants/colors';
import { Input } from '../../components/common/Input';
import { Button } from '../../components/common/Button';
import { PatientStackParamList } from '../../navigation/PatientNavigator';
import api from '../../services/api';

type AddEditAddressRouteProp = RouteProp<PatientStackParamList, 'AddEditAddress'>;

interface AddressForm {
  label: string;
  addressLine: string;
  city: string;
  state: string;
  pincode: string;
  lat: string;
  lng: string;
  isDefault: boolean;
}

interface FormErrors {
  label?: string;
  addressLine?: string;
  city?: string;
  state?: string;
  pincode?: string;
}

export const AddEditAddressScreen: React.FC = () => {
  const navigation = useNavigation();
  const route = useRoute<AddEditAddressRouteProp>();
  const queryClient = useQueryClient();
  const existingAddress = route.params?.address;
  const isEditing = !!existingAddress;

  const [form, setForm] = useState<AddressForm>({
    label: existingAddress?.label || '',
    addressLine: existingAddress?.addressLine || '',
    city: existingAddress?.city || '',
    state: existingAddress?.state || '',
    pincode: existingAddress?.pincode || '',
    lat: existingAddress?.lat?.toString() || '',
    lng: existingAddress?.lng?.toString() || '',
    isDefault: existingAddress?.isDefault || false,
  });

  const [errors, setErrors] = useState<FormErrors>({});
  const [locationLoading, setLocationLoading] = useState(false);

  const validate = (): boolean => {
    const newErrors: FormErrors = {};

    if (!form.label.trim()) newErrors.label = 'Label is required';
    if (!form.addressLine.trim())
      newErrors.addressLine = 'Address line is required';
    if (!form.city.trim()) newErrors.city = 'City is required';
    if (!form.state.trim()) newErrors.state = 'State is required';
    if (!form.pincode.trim()) newErrors.pincode = 'Pincode is required';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const saveMutation = useMutation({
    mutationFn: async (data: Record<string, unknown>) => {
      if (isEditing) {
        return api.put(`/patients/me/addresses/${existingAddress.id}`, data);
      }
      return api.post('/patients/me/addresses', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['patient-addresses'] });
      navigation.goBack();
    },
    onError: () => {
      Alert.alert('Error', 'Failed to save address. Please try again.');
    },
  });

  const handleSave = () => {
    if (!validate()) return;

    const data: Record<string, unknown> = {
      label: form.label.trim(),
      addressLine: form.addressLine.trim(),
      city: form.city.trim(),
      state: form.state.trim(),
      pincode: form.pincode.trim(),
      isDefault: form.isDefault,
    };

    if (form.lat) data.lat = parseFloat(form.lat);
    if (form.lng) data.lng = parseFloat(form.lng);

    saveMutation.mutate(data);
  };

  const handleUseCurrentLocation = async () => {
    setLocationLoading(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Permission Denied',
          'Location permission is required to autofill coordinates.',
        );
        return;
      }

      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });

      setForm((prev) => ({
        ...prev,
        lat: location.coords.latitude.toString(),
        lng: location.coords.longitude.toString(),
      }));

      try {
        const [geocode] = await Location.reverseGeocodeAsync({
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
        });

        if (geocode) {
          setForm((prev) => ({
            ...prev,
            city: geocode.city || prev.city,
            state: geocode.region || prev.state,
            pincode: geocode.postalCode || prev.pincode,
            addressLine:
              [geocode.streetNumber, geocode.street, geocode.district]
                .filter(Boolean)
                .join(', ') || prev.addressLine,
          }));
        }
      } catch {
        // Reverse geocoding failed - coordinates are still set
      }
    } catch {
      Alert.alert('Error', 'Failed to get your current location.');
    } finally {
      setLocationLoading(false);
    }
  };

  const updateField = (field: keyof AddressForm, value: string | boolean) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (errors[field as keyof FormErrors]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  };

  return (
    <ScrollView style={styles.container} keyboardShouldPersistTaps="handled">
      <View style={styles.content}>
        <Button
          title={locationLoading ? 'Getting location...' : '📍 Use Current Location'}
          onPress={handleUseCurrentLocation}
          variant="outline"
          loading={locationLoading}
          style={styles.locationButton}
        />

        <Input
          label="Label"
          placeholder="e.g. Home, Office, Clinic"
          value={form.label}
          onChangeText={(v) => updateField('label', v)}
          error={errors.label}
        />

        <Input
          label="Address Line"
          placeholder="Street address, building, floor"
          value={form.addressLine}
          onChangeText={(v) => updateField('addressLine', v)}
          error={errors.addressLine}
          multiline
        />

        <Input
          label="City"
          placeholder="City"
          value={form.city}
          onChangeText={(v) => updateField('city', v)}
          error={errors.city}
        />

        <Input
          label="State"
          placeholder="State"
          value={form.state}
          onChangeText={(v) => updateField('state', v)}
          error={errors.state}
        />

        <Input
          label="Pincode"
          placeholder="Pincode"
          value={form.pincode}
          onChangeText={(v) => updateField('pincode', v)}
          error={errors.pincode}
          keyboardType="number-pad"
        />

        <View style={styles.coordsRow}>
          <View style={styles.coordField}>
            <Input
              label="Latitude"
              placeholder="Lat"
              value={form.lat}
              onChangeText={(v) => updateField('lat', v)}
              keyboardType="decimal-pad"
            />
          </View>
          <View style={styles.coordField}>
            <Input
              label="Longitude"
              placeholder="Lng"
              value={form.lng}
              onChangeText={(v) => updateField('lng', v)}
              keyboardType="decimal-pad"
            />
          </View>
        </View>

        <View style={styles.switchRow}>
          <Text style={styles.switchLabel}>Set as default address</Text>
          <Switch
            value={form.isDefault}
            onValueChange={(v) => updateField('isDefault', v)}
            trackColor={{ true: Colors.primary, false: Colors.border }}
            thumbColor={Colors.white}
          />
        </View>

        <Button
          title={isEditing ? 'Update Address' : 'Save Address'}
          onPress={handleSave}
          loading={saveMutation.isPending}
          style={styles.saveButton}
        />
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { padding: 16 },
  locationButton: { marginBottom: 20 },
  coordsRow: { flexDirection: 'row', gap: 12 },
  coordField: { flex: 1 },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    marginBottom: 8,
  },
  switchLabel: { fontSize: 15, fontWeight: '500', color: Colors.text },
  saveButton: { marginTop: 8 },
});
