import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert } from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import { Colors } from '../../constants/colors';
import { Button } from '../../components/common/Button';
import { Card } from '../../components/common/Card';
import { bookingService } from '../../services/bookingService';
import { PatientStackParamList } from '../../navigation/PatientNavigator';
import { useBookingStore } from '../../store/bookingStore';
import { formatCurrency } from '../../utils/format';

type Props = {
  navigation: NativeStackNavigationProp<PatientStackParamList, 'BookingConfirm'>;
  route: RouteProp<PatientStackParamList, 'BookingConfirm'>;
};

export const BookingConfirmScreen: React.FC<Props> = ({ navigation, route }) => {
  const { providerId, mode, fee } = route.params;
  const { selectedProvider, selectedService, symptoms } = useBookingStore();
  const [loading, setLoading] = useState(false);

  const handleConfirm = async () => {
    setLoading(true);
    try {
      const booking = await bookingService.createBooking({
        providerId,
        serviceCategoryId: selectedService?.id || '',
        mode,
        scheduledAt: new Date().toISOString(),
        symptoms,
      });

      navigation.replace('Payment', { bookingId: booking.id, amount: fee });
    } catch (err: any) {
      Alert.alert('Error', err?.response?.data?.error || 'Failed to create booking. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <Card style={styles.card}>
        <Text style={styles.sectionTitle}>Booking Summary</Text>

        <View style={styles.row}>
          <Text style={styles.label}>Provider</Text>
          <Text style={styles.value}>{selectedProvider?.name || 'Selected Provider'}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Specialization</Text>
          <Text style={styles.value}>{selectedProvider?.specialization || '-'}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Service</Text>
          <Text style={styles.value}>{selectedService?.name || '-'}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Mode</Text>
          <Text style={styles.value}>{mode === 'HOME_VISIT' ? '🏠 Home Visit' : '🏥 Clinic Visit'}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Time</Text>
          <Text style={styles.value}>Now</Text>
        </View>
        {symptoms ? (
          <View style={styles.row}>
            <Text style={styles.label}>Symptoms</Text>
            <Text style={[styles.value, styles.symptomsText]}>{symptoms}</Text>
          </View>
        ) : null}
        <View style={[styles.row, styles.feeRow]}>
          <Text style={styles.feeLabel}>Consultation Fee</Text>
          <Text style={styles.feeValue}>{formatCurrency(fee)}</Text>
        </View>
      </Card>

      <View style={styles.footer}>
        <Button title="Confirm & Proceed to Payment" onPress={handleConfirm} loading={loading} />
        <Button
          title="Cancel"
          onPress={() => navigation.goBack()}
          variant="outline"
          style={{ marginTop: 12 }}
        />
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  card: { margin: 16 },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: Colors.text, marginBottom: 16 },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  label: { fontSize: 14, color: Colors.textMuted },
  value: { fontSize: 14, fontWeight: '600', color: Colors.text, flex: 1, textAlign: 'right' },
  symptomsText: { fontStyle: 'italic' },
  feeRow: { borderBottomWidth: 0, marginTop: 8 },
  feeLabel: { fontSize: 16, fontWeight: '700', color: Colors.text },
  feeValue: { fontSize: 20, fontWeight: '800', color: Colors.primary },
  footer: { padding: 16 },
});
