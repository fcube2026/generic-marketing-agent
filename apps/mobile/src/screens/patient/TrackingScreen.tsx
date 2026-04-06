import React from 'react';
import { View, Text, StyleSheet, ScrollView, Alert, Linking, Platform } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import MapView, { Marker } from 'react-native-maps';
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
import { formatEta } from '../../utils/format';
import { haversineDistance } from '../../utils/location';

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

/** Statuses where the provider is actively en route / on-site. */
const TRACKING_STATUSES: BookingStatus[] = ['ON_THE_WAY', 'ARRIVED', 'IN_PROGRESS'];

export const TrackingScreen: React.FC<Props> = ({ navigation, route }) => {
  const { bookingId } = route.params;

  const { data: booking, isLoading } = useQuery<Booking>({
    queryKey: ['booking', bookingId],
    queryFn: () => bookingService.getBooking(bookingId),
    refetchInterval: 10000,
  });

  const isHomeVisit = booking?.mode === 'HOME_VISIT';
  const isDoctorPlace = booking?.mode === 'DOCTOR_PLACE';
  const isTrackable =
    isHomeVisit &&
    !!booking?.status &&
    TRACKING_STATUSES.includes(booking.status as BookingStatus);

  const { data: providerLocation } = useQuery<{
    lat: number | null;
    lng: number | null;
    recordedAt: string | null;
  }>({
    queryKey: ['provider-location', bookingId],
    queryFn: () => bookingService.getProviderLocation(bookingId),
    refetchInterval: 5000,
    enabled: isTrackable,
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

  /** Open external maps app with the clinic's coordinates or address. */
  const handleNavigateToClinic = () => {
    const providerLat = booking?.provider?.currentLat;
    const providerLng = booking?.provider?.currentLng;
    const clinicAddr = booking?.provider?.clinicAddress;

    let url: string;
    if (providerLat != null && providerLng != null) {
      url = Platform.select({
        ios: `maps:0,0?daddr=${providerLat},${providerLng}`,
        default: `https://maps.google.com/?daddr=${providerLat},${providerLng}`,
      })!;
    } else if (clinicAddr) {
      url = `https://maps.google.com/?daddr=${encodeURIComponent(clinicAddr)}`;
    } else {
      return;
    }
    Linking.openURL(url);
  };

  if (isLoading) return <LoadingSpinner fullScreen message="Loading booking..." />;
  if (!booking) return null;

  const currentStepIndex = STATUS_STEPS.indexOf(booking.status as BookingStatus);

  const hasProviderCoords =
    providerLocation?.lat != null && providerLocation?.lng != null;

  const addressLat = booking.address?.lat;
  const addressLng = booking.address?.lng;

  // Clinic location from provider profile (used for DOCTOR_PLACE map)
  const clinicLat = booking.provider?.currentLat;
  const clinicLng = booking.provider?.currentLng;
  const hasClinicCoords = clinicLat != null && clinicLng != null;
  const clinicAddress = booking.provider?.clinicAddress;
  const providerContact = booking.provider?.contactInfo;

  // Compute ETA for clinic visit (distance × 2 min/km, same multiplier as recommendation engine)
  const ETA_MULTIPLIER_DOCTOR_PLACE = 2;
  let clinicEta: number | null = null;
  if (isDoctorPlace && hasClinicCoords && addressLat != null && addressLng != null) {
    const dist = haversineDistance(addressLat, addressLng, clinicLat!, clinicLng!);
    clinicEta = Math.max(1, Math.round(dist * ETA_MULTIPLIER_DOCTOR_PLACE));
  }

  return (
    <ScrollView style={styles.container}>
      {/* Map view for home-visit bookings when provider is trackable */}
      {isTrackable && hasProviderCoords && (
        <Card style={styles.mapCard}>
          <Text style={styles.sectionTitle}>Provider Location</Text>
          <View style={styles.mapWrapper}>
            <MapView
              style={styles.map}
              region={{
                latitude: providerLocation!.lat!,
                longitude: providerLocation!.lng!,
                latitudeDelta: 0.015,
                longitudeDelta: 0.015,
              }}
            >
              <Marker
                coordinate={{
                  latitude: providerLocation!.lat!,
                  longitude: providerLocation!.lng!,
                }}
                title="Provider"
                description="Provider's current location"
                pinColor={Colors.primary}
              />
              {addressLat != null && addressLng != null && (
                <Marker
                  coordinate={{ latitude: addressLat, longitude: addressLng }}
                  title="Your Address"
                  pinColor={Colors.error}
                />
              )}
            </MapView>
          </View>
          {providerLocation?.recordedAt && (
            <Text style={styles.lastUpdated}>
              Last updated:{' '}
              {new Date(providerLocation.recordedAt).toLocaleTimeString()}
            </Text>
          )}
        </Card>
      )}

      {/* Clinic location map for doctor-place bookings */}
      {isDoctorPlace && hasClinicCoords && (
        <Card style={styles.mapCard}>
          <Text style={styles.sectionTitle}>Clinic Location</Text>
          <View style={styles.mapWrapper}>
            <MapView
              style={styles.map}
              region={{
                latitude: clinicLat!,
                longitude: clinicLng!,
                latitudeDelta: 0.015,
                longitudeDelta: 0.015,
              }}
            >
              <Marker
                coordinate={{ latitude: clinicLat!, longitude: clinicLng! }}
                title={booking.provider?.name ?? 'Clinic'}
                description={clinicAddress || 'Clinic location'}
                pinColor={Colors.primary}
              />
            </MapView>
          </View>
          {clinicEta != null && (
            <Text style={styles.etaText}>Estimated travel time: {formatEta(clinicEta)}</Text>
          )}
          <Button
            title="🧭 Navigate to Clinic"
            onPress={handleNavigateToClinic}
            style={styles.navigateBtn}
          />
        </Card>
      )}

      {/* Clinic address & contact for doctor-place bookings */}
      {isDoctorPlace && (clinicAddress || providerContact) && (
        <Card style={styles.clinicInfoCard}>
          <Text style={styles.sectionTitle}>Clinic Details</Text>
          {clinicAddress ? (
            <Text style={styles.addressText}>{clinicAddress}</Text>
          ) : null}
          {providerContact ? (
            <Text style={styles.contactText}>📞 Contact: {providerContact}</Text>
          ) : null}
        </Card>
      )}

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
        <Card style={styles.errorCard}>
          <Text style={styles.errorCardTitle}>Booking Declined</Text>
          <Text style={styles.errorCardMessage}>
            Your booking request was declined by the provider. Please try booking with another provider.
          </Text>
        </Card>
      )}

      {booking.status === 'CANCELLED' && (
        <Card style={styles.errorCard}>
          <Text style={styles.errorCardTitle}>Booking Cancelled</Text>
          <Text style={styles.errorCardMessage}>
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
  mapCard: { margin: 16, marginBottom: 0 },
  mapWrapper: { borderRadius: 10, overflow: 'hidden', marginTop: 8 },
  map: { width: '100%', height: 220 },
  lastUpdated: { fontSize: 11, color: Colors.textMuted, marginTop: 6, textAlign: 'right' },
  etaText: { fontSize: 14, fontWeight: '600', color: Colors.primary, marginTop: 10 },
  navigateBtn: { marginTop: 10 },
  clinicInfoCard: { marginHorizontal: 16, marginBottom: 12 },
  contactText: { fontSize: 14, color: Colors.text, lineHeight: 20, marginTop: 4 },
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
  errorCard: { marginHorizontal: 16, marginBottom: 12, backgroundColor: '#FEE2E2' },
  errorCardTitle: { fontSize: 16, fontWeight: '700', color: Colors.error, marginBottom: 4 },
  errorCardMessage: { fontSize: 14, color: Colors.error, lineHeight: 20 },
});
