import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  SafeAreaView, Alert, Linking,
} from 'react-native';
import { useRoute, useNavigation, RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Colors } from '../../constants/colors';
import { bookingService } from '../../services/bookingService';
import { useProviderLocationTracking } from '../../hooks/useProviderLocationTracking';
import type { ProviderStackParamList } from '../../navigation/ProviderNavigator';

type Route = RouteProp<ProviderStackParamList, 'BookingDetail'>;
type Nav = NativeStackNavigationProp<ProviderStackParamList>;

const STATUS_LABELS: Record<string, string> = {
  REQUESTED: 'Requested',
  ACCEPTED: 'Accepted',
  ON_THE_WAY: 'On the Way',
  ARRIVED: 'Arrived',
  IN_PROGRESS: 'In Progress',
  COMPLETED: 'Completed',
  SUMMARY_SUBMITTED: 'Summary Submitted',
  CLOSED: 'Closed',
  CANCELLED: 'Cancelled',
};

const STATUS_ORDER = ['REQUESTED', 'ACCEPTED', 'ON_THE_WAY', 'ARRIVED', 'IN_PROGRESS', 'COMPLETED'];

export const BookingDetailScreen: React.FC = () => {
  const route = useRoute<Route>();
  const navigation = useNavigation<Nav>();
  const { bookingId } = route.params;
  const [booking, setBooking] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);

  // Push provider location at intervals for active home-visit bookings
  useProviderLocationTracking(bookingId, booking?.status);

  useEffect(() => {
    bookingService.getBookingById(bookingId).then(data => {
      setBooking(data);
      setLoading(false);
    });
  }, [bookingId]);

  const updateStatus = async (newStatus: string) => {
    setUpdating(true);
    try {
      await bookingService.updateStatus(bookingId, newStatus);
      setBooking((prev: any) => ({ ...prev, status: newStatus }));
      if (newStatus === 'IN_PROGRESS') {
        navigation.navigate('ConsultationForm', { bookingId });
      }
    } catch {
      Alert.alert('Error', 'Failed to update status.');
    } finally {
      setUpdating(false);
    }
  };

  const handleAccept = async () => {
    setUpdating(true);
    try {
      await bookingService.acceptBooking(bookingId);
      setBooking((prev: any) => ({ ...prev, status: 'ACCEPTED' }));
    } catch {
      Alert.alert('Error', 'Failed to accept booking.');
    } finally {
      setUpdating(false);
    }
  };

  const handleDecline = () => {
    Alert.alert('Decline Booking', 'Are you sure you want to decline this booking?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Decline',
        style: 'destructive',
        onPress: async () => {
          setUpdating(true);
          try {
            await bookingService.declineBooking(bookingId);
            setBooking((prev: any) => ({ ...prev, status: 'DECLINED' }));
            navigation.goBack();
          } catch {
            Alert.alert('Error', 'Failed to decline booking.');
          } finally {
            setUpdating(false);
          }
        },
      },
    ]);
  };

  const openMaps = (address: string) => {
    const url = `https://maps.google.com/?q=${encodeURIComponent(address)}`;
    Linking.openURL(url);
  };

  if (loading) {
    return <View style={styles.center}><Text style={styles.loadingText}>Loading booking…</Text></View>;
  }

  if (!booking) {
    return <View style={styles.center}><Text style={styles.loadingText}>Booking not found.</Text></View>;
  }

  const currentStep = STATUS_ORDER.indexOf(booking.status);

  const getNextAction = () => {
    switch (booking.status) {
      case 'ACCEPTED': return { label: '🚗 Start Journey', next: 'ON_THE_WAY' };
      case 'ON_THE_WAY': return { label: '📍 Mark Arrived', next: 'ARRIVED' };
      case 'ARRIVED': return { label: '🩺 Begin Consultation', next: 'IN_PROGRESS' };
      case 'IN_PROGRESS': return { label: '✅ Complete & Write Summary', next: 'COMPLETED' };
      default: return null;
    }
  };

  const nextAction = getNextAction();

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        {/* Status */}
        <View style={styles.statusCard}>
          <Text style={styles.statusLabel}>Status</Text>
          <Text style={styles.statusValue}>{STATUS_LABELS[booking.status] || booking.status}</Text>
        </View>

        {/* Status Timeline */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Progress</Text>
          {STATUS_ORDER.map((s, i) => (
            <View key={s} style={styles.timelineRow}>
              <View style={[styles.dot, i <= currentStep ? styles.dotDone : styles.dotPending]} />
              {i < STATUS_ORDER.length - 1 && (
                <View style={[styles.line, i < currentStep ? styles.lineDone : styles.linePending]} />
              )}
              <Text style={[styles.stepLabel, i <= currentStep ? styles.stepLabelDone : {}]}>
                {STATUS_LABELS[s]}
              </Text>
            </View>
          ))}
        </View>

        {/* Patient Info */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Patient</Text>
          <Text style={styles.infoText}>Name: {booking.patient?.name || 'Patient'}</Text>
          <Text style={styles.infoText}>Phone: {booking.patient?.phone ? `+91 ****${booking.patient.phone.slice(-4)}` : '—'}</Text>
          <Text style={styles.infoText}>Service: {booking.serviceCategory?.name || '—'}</Text>
          <Text style={styles.infoText}>Mode: {booking.mode === 'HOME_VISIT' ? '🏠 Home Visit' : '🏥 Clinic Visit'}</Text>
          {booking.symptoms && <Text style={styles.infoText}>Symptoms: {booking.symptoms}</Text>}
        </View>

        {/* Address */}
        {booking.mode === 'HOME_VISIT' && booking.address && (() => {
          const addr: any = booking.address;
          const addrText = typeof addr === 'string'
            ? addr
            : [addr.label, addr.addressLine, addr.city, addr.state, addr.pincode].filter(Boolean).join(', ');
          return (
            <View style={styles.card}>
              <Text style={styles.sectionTitle}>Patient Address</Text>
              <Text style={styles.infoText}>{addrText}</Text>
              <TouchableOpacity style={styles.mapBtn} onPress={() => openMaps(addrText)}>
                <Text style={styles.mapBtnText}>🗺 Open in Maps</Text>
              </TouchableOpacity>
            </View>
          );
        })()}

        {/* Fee */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Fee</Text>
          <Text style={styles.feeText}>₹{booking.totalFee}</Text>
          <Text style={styles.payStatus}>Payment: {booking.paymentStatus}</Text>
        </View>

        {/* Action Button */}
        {booking.status === 'REQUESTED' && (
          <View style={styles.acceptDeclineRow}>
            <TouchableOpacity
              style={[styles.declineBtn, updating && { opacity: 0.7 }]}
              onPress={handleDecline}
              disabled={updating}
            >
              <Text style={styles.declineBtnText}>Decline</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.acceptBtn, updating && { opacity: 0.7 }]}
              onPress={handleAccept}
              disabled={updating}
            >
              <Text style={styles.acceptBtnText}>{updating ? 'Working…' : 'Accept Booking'}</Text>
            </TouchableOpacity>
          </View>
        )}

        {nextAction && (
          <TouchableOpacity
            style={[styles.actionBtn, updating && { opacity: 0.7 }]}
            onPress={() => updateStatus(nextAction.next)}
            disabled={updating}
          >
            <Text style={styles.actionBtnText}>{updating ? 'Updating…' : nextAction.label}</Text>
          </TouchableOpacity>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { padding: 16, paddingBottom: 40 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  loadingText: { color: Colors.textMuted, fontSize: 16 },
  statusCard: { backgroundColor: Colors.primary, borderRadius: 12, padding: 16, marginBottom: 16, alignItems: 'center' },
  statusLabel: { color: Colors.primaryLight, fontSize: 12, fontWeight: '600', marginBottom: 4 },
  statusValue: { color: Colors.white, fontSize: 20, fontWeight: '700' },
  card: { backgroundColor: Colors.card, borderRadius: 12, padding: 16, marginBottom: 14, elevation: 2, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 4 },
  sectionTitle: { fontSize: 14, fontWeight: '700', color: Colors.textMuted, marginBottom: 10, textTransform: 'uppercase', letterSpacing: 0.5 },
  infoText: { fontSize: 14, color: Colors.text, marginBottom: 6 },
  timelineRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 4 },
  dot: { width: 12, height: 12, borderRadius: 6, marginTop: 3, marginRight: 10 },
  dotDone: { backgroundColor: Colors.primary },
  dotPending: { backgroundColor: Colors.border },
  line: { position: 'absolute', left: 5, top: 15, width: 2, height: 20 },
  lineDone: { backgroundColor: Colors.primary },
  linePending: { backgroundColor: Colors.border },
  stepLabel: { fontSize: 13, color: Colors.textMuted, marginLeft: 2 },
  stepLabelDone: { color: Colors.text, fontWeight: '600' },
  mapBtn: { marginTop: 10, backgroundColor: Colors.primaryLight, borderRadius: 8, padding: 10, alignItems: 'center' },
  mapBtnText: { color: Colors.primary, fontWeight: '600' },
  feeText: { fontSize: 26, fontWeight: '700', color: Colors.primary },
  payStatus: { fontSize: 13, color: Colors.textMuted, marginTop: 4 },
  actionBtn: { backgroundColor: Colors.primary, borderRadius: 14, padding: 18, alignItems: 'center', marginTop: 8 },
  actionBtnText: { color: Colors.white, fontSize: 16, fontWeight: '700' },
  acceptDeclineRow: { flexDirection: 'row', gap: 12, marginTop: 8 },
  declineBtn: { flex: 1, borderWidth: 1.5, borderColor: Colors.error, borderRadius: 14, padding: 16, alignItems: 'center', backgroundColor: Colors.white },
  declineBtnText: { color: Colors.error, fontSize: 15, fontWeight: '700' },
  acceptBtn: { flex: 1, backgroundColor: Colors.primary, borderRadius: 14, padding: 16, alignItems: 'center' },
  acceptBtnText: { color: Colors.white, fontSize: 15, fontWeight: '700' },
});
