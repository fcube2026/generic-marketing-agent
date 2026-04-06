import React from 'react';
import { View, Text, StyleSheet, ScrollView, Alert } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import { Colors } from '../../constants/colors';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { BookingStatusBadge } from '../../components/booking/BookingStatusBadge';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { bookingService } from '../../services/bookingService';
import { PatientStackParamList } from '../../navigation/PatientNavigator';
import { BookingStatus, Booking } from '../../types';

type Props = {
  navigation: NativeStackNavigationProp<PatientStackParamList, 'Tracking'>;
  route: RouteProp<PatientStackParamList, 'Tracking'>;
};

const STATUS_STEPS: BookingStatus[] = [
  'REQUESTED',
  'ACCEPTED',
  'ON_THE_WAY',
  'ARRIVED',
  'IN_PROGRESS',
  'COMPLETED',
];

export const TrackingScreen: React.FC<Props> = ({ navigation, route }) => {
  const { bookingId } = route.params;

  const { data: booking, isLoading } = useQuery<Booking>({
    queryKey: ['booking', bookingId],
    queryFn: () => bookingService.getBooking(bookingId),
    refetchInterval: 10000,
  });

  const handleCancel = async () => {
    Alert.alert('Cancel Booking', 'Are you sure you want to cancel?', [
      { text: 'No', style: 'cancel' },
      {
        text: 'Yes, Cancel',
        style: 'destructive',
        onPress: async () => {
          await bookingService.cancelBooking(bookingId);
        },
      },
    ]);
  };

  if (isLoading) return <LoadingSpinner fullScreen message="Loading booking..." />;
  if (!booking) return null;

  const currentStepIndex = STATUS_STEPS.indexOf(booking.status as BookingStatus);

  return (
    <ScrollView style={styles.container}>
      <Card style={styles.statusCard}>
        <View style={styles.statusHeader}>
          <Text style={styles.statusTitle}>Booking Status</Text>
          <BookingStatusBadge status={booking.status as BookingStatus} />
        </View>
        <View style={styles.steps}>
          {STATUS_STEPS.map((step, i) => (
            <View key={step} style={styles.step}>
              <View
                style={[
                  styles.stepDot,
                  i <= currentStepIndex && styles.stepDotActive,
                  i < currentStepIndex && styles.stepDotDone,
                ]}
              >
                {i < currentStepIndex && <Text style={styles.stepCheck}>✓</Text>}
                {i === currentStepIndex && <View style={styles.stepPulse} />}
              </View>
              <Text style={[styles.stepLabel, i <= currentStepIndex && styles.stepLabelActive]}>
                {step.replace(/_/g, ' ')}
              </Text>
              {i < STATUS_STEPS.length - 1 && (
                <View style={[styles.stepLine, i < currentStepIndex && styles.stepLineActive]} />
              )}
            </View>
          ))}
        </View>
      </Card>

      {booking.provider && (
        <Card style={styles.providerCard}>
          <Text style={styles.sectionTitle}>Your Provider</Text>
          <Text style={styles.providerName}>{booking.provider.name}</Text>
          <Text style={styles.providerSpec}>{booking.provider.specialization}</Text>
        </Card>
      )}

      {booking.address && (
        <Card style={styles.addressCard}>
          <Text style={styles.sectionTitle}>Visit Address</Text>
          <Text style={styles.addressText}>{booking.address.addressLine}</Text>
          <Text style={styles.addressText}>
            {booking.address.city}, {booking.address.state} - {booking.address.pincode}
          </Text>
        </Card>
      )}

      {(booking.status === 'COMPLETED' || booking.status === 'SUMMARY_SUBMITTED') && (
        <Button
          title="View Consultation Summary"
          onPress={() => navigation.navigate('ConsultationSummary', { bookingId })}
          style={styles.summaryBtn}
        />
      )}

      {booking.status === 'DECLINED' && (
        <Card style={styles.declinedCard}>
          <Text style={styles.declinedTitle}>Booking Declined</Text>
          <Text style={styles.declinedMessage}>
            Your booking request was declined by the provider. Please try booking with another provider.
          </Text>
        </Card>
      )}

      {booking.status === 'CANCELLED' && (
        <Card style={styles.cancelledCard}>
          <Text style={styles.cancelledTitle}>Booking Cancelled</Text>
          <Text style={styles.cancelledMessage}>
            This booking has been cancelled.
          </Text>
        </Card>
      )}

      {(booking.status === 'REQUESTED' || booking.status === 'ACCEPTED') && (
        <Button
          title="Cancel Booking"
          onPress={handleCancel}
          variant="danger"
          style={styles.cancelBtn}
        />
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  statusCard: { margin: 16 },
  statusHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  statusTitle: { fontSize: 16, fontWeight: '700', color: Colors.text },
  steps: { gap: 0 },
  step: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  stepDot: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  stepDotActive: { backgroundColor: Colors.primary },
  stepDotDone: { backgroundColor: Colors.success },
  stepCheck: { color: Colors.white, fontSize: 12, fontWeight: '700' },
  stepPulse: { width: 10, height: 10, borderRadius: 5, backgroundColor: Colors.white },
  stepLabel: { fontSize: 13, color: Colors.textMuted, flex: 1 },
  stepLabelActive: { color: Colors.text, fontWeight: '600' },
  stepLine: { position: 'absolute', left: 11, top: 28, width: 2, height: 20, backgroundColor: Colors.border },
  stepLineActive: { backgroundColor: Colors.success },
  providerCard: { marginHorizontal: 16, marginBottom: 12 },
  addressCard: { marginHorizontal: 16, marginBottom: 12 },
  sectionTitle: { fontSize: 13, color: Colors.textMuted, marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 },
  providerName: { fontSize: 18, fontWeight: '700', color: Colors.text },
  providerSpec: { fontSize: 14, color: Colors.textMuted },
  addressText: { fontSize: 14, color: Colors.text, lineHeight: 20 },
  summaryBtn: { marginHorizontal: 16, marginBottom: 12 },
  cancelBtn: { marginHorizontal: 16, marginBottom: 16 },
  declinedCard: { marginHorizontal: 16, marginBottom: 12, backgroundColor: '#FEE2E2' },
  declinedTitle: { fontSize: 16, fontWeight: '700', color: Colors.error, marginBottom: 4 },
  declinedMessage: { fontSize: 14, color: Colors.error, lineHeight: 20 },
  cancelledCard: { marginHorizontal: 16, marginBottom: 12, backgroundColor: '#FEE2E2' },
  cancelledTitle: { fontSize: 16, fontWeight: '700', color: Colors.error, marginBottom: 4 },
  cancelledMessage: { fontSize: 14, color: Colors.error, lineHeight: 20 },
});
