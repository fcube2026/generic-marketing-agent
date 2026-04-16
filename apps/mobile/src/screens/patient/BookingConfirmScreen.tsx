import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
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

const MODE_LABELS: Record<string, string> = {
  HOME_VISIT: '🏠 Home Visit',
  DOCTOR_PLACE: '🏥 Clinic Visit',
  VIDEO_CONSULTATION: '📹 Video Consultation',
};

const getModeLabel = (mode: string) => MODE_LABELS[mode] ?? mode;

export const BookingConfirmScreen: React.FC<Props> = ({ navigation, route }) => {
  const { providerId, mode, fee } = route.params;
  const { selectedProvider, selectedService, selectedAddress, symptoms, setLastBookingId } = useBookingStore();
  const [loading, setLoading] = useState(false);
  const [bookingSuccess, setBookingSuccess] = useState(false);
  const [bookingId, setBookingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleConfirm = async () => {
    if (mode === 'HOME_VISIT' && !selectedAddress) {
      setError('Please select an address for home visit bookings.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const booking = await bookingService.createBooking({
        providerId,
        serviceCategoryId: selectedService?.id || '',
        addressId: mode === 'HOME_VISIT' ? selectedAddress?.id : undefined,
        mode,
        scheduledAt: new Date().toISOString(),
        symptoms,
      });

      setBookingId(booking.id);
      setLastBookingId(booking.id);
      setBookingSuccess(true);
    } catch (err: any) {
      setError(
        err?.response?.data?.message ||
        err?.response?.data?.error ||
        'Failed to create booking. Please try again.',
      );
    } finally {
      setLoading(false);
    }
  };

  if (bookingSuccess && bookingId) {
    return (
      <View style={styles.successContainer}>
        <View style={styles.successIcon}>
          <Text style={styles.successEmoji}>✅</Text>
        </View>
        <Text style={styles.successTitle}>Booking Confirmed!</Text>
        <Text style={styles.successMessage}>
          Your booking has been submitted successfully. The provider will review
          your request shortly.
        </Text>
        <Card style={styles.bookingIdCard}>
          <Text style={styles.bookingIdLabel}>Booking ID</Text>
          <Text style={styles.bookingIdValue}>{bookingId}</Text>
        </Card>
        <View style={styles.successActions}>
          <Button
            title="Proceed to Payment"
            onPress={() => navigation.replace('Payment', { bookingId, amount: fee })}
          />
          <Button
            title="Back to Home"
            onPress={() => navigation.popToTop()}
            variant="outline"
            style={{ marginTop: 12 }}
          />
        </View>
      </View>
    );
  }

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
          <Text style={styles.value}>{getModeLabel(mode)}</Text>
        </View>
        {mode === 'HOME_VISIT' && selectedAddress && (
          <View style={styles.row}>
            <Text style={styles.label}>Address</Text>
            <Text style={[styles.value, styles.addressText]}>
              {selectedAddress.label} – {selectedAddress.addressLine}, {selectedAddress.city}
            </Text>
          </View>
        )}
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

      {error && (
        <Card style={styles.errorCard}>
          <Text style={styles.errorIcon}>⚠️</Text>
          <Text style={styles.errorText}>{error}</Text>
          <Button
            title="Dismiss"
            onPress={() => setError(null)}
            variant="outline"
            style={{ marginTop: 12 }}
          />
        </Card>
      )}

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
  addressText: { fontSize: 13 },
  symptomsText: { fontStyle: 'italic' },
  feeRow: { borderBottomWidth: 0, marginTop: 8 },
  feeLabel: { fontSize: 16, fontWeight: '700', color: Colors.text },
  feeValue: { fontSize: 20, fontWeight: '800', color: Colors.primary },
  footer: { padding: 16 },
  errorCard: { marginHorizontal: 16, marginBottom: 8, backgroundColor: '#FEF2F2', alignItems: 'center' },
  errorIcon: { fontSize: 28, marginBottom: 8 },
  errorText: { fontSize: 14, color: Colors.error, textAlign: 'center', lineHeight: 20 },
  successContainer: { flex: 1, backgroundColor: Colors.background, justifyContent: 'center', alignItems: 'center', padding: 24 },
  successIcon: { marginBottom: 16 },
  successEmoji: { fontSize: 64 },
  successTitle: { fontSize: 22, fontWeight: '700', color: Colors.success, marginBottom: 8 },
  successMessage: { fontSize: 15, color: Colors.textMuted, textAlign: 'center', lineHeight: 22, marginBottom: 24 },
  bookingIdCard: { marginBottom: 24, alignItems: 'center', width: '100%' },
  bookingIdLabel: { fontSize: 12, color: Colors.textMuted, marginBottom: 4 },
  bookingIdValue: { fontSize: 14, fontWeight: '600', color: Colors.text },
  successActions: { width: '100%' },
});
