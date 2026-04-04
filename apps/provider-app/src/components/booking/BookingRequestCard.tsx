import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Booking } from '../../types';
import { Colors } from '../../constants/colors';
import { formatDateTime, formatCurrency } from '../../utils/format';

interface Props { booking: Booking; onAccept: () => void; onDecline: () => void; }
export const BookingRequestCard: React.FC<Props> = ({ booking, onAccept, onDecline }) => (
  <View style={styles.card}>
    <View style={styles.header}>
      <Text style={styles.mode}>{booking.mode === 'HOME_VISIT' ? '🏠 Home Visit' : '🏥 Clinic'}</Text>
      <Text style={styles.fee}>{formatCurrency(booking.totalFee)}</Text>
    </View>
    <Text style={styles.patient}>{booking.patient?.name || 'Patient'}</Text>
    <Text style={styles.service}>{booking.serviceCategory?.name}</Text>
    {booking.symptoms && <Text style={styles.symptoms}>Symptoms: {booking.symptoms}</Text>}
    <Text style={styles.time}>{formatDateTime(booking.scheduledAt)}</Text>
    <View style={styles.actions}>
      <TouchableOpacity style={[styles.btn, styles.declineBtn]} onPress={onDecline}>
        <Text style={styles.declineBtnText}>✕ Decline</Text>
      </TouchableOpacity>
      <TouchableOpacity style={[styles.btn, styles.acceptBtn]} onPress={onAccept}>
        <Text style={styles.acceptBtnText}>✓ Accept</Text>
      </TouchableOpacity>
    </View>
  </View>
);
const styles = StyleSheet.create({
  card: { backgroundColor: Colors.white, borderRadius: 12, padding: 16, marginBottom: 12, borderLeftWidth: 4, borderLeftColor: Colors.primary, elevation: 3 },
  header: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  mode: { fontSize: 13, color: Colors.primary, fontWeight: '700' },
  fee: { fontSize: 18, fontWeight: '800', color: Colors.text },
  patient: { fontSize: 18, fontWeight: '700', color: Colors.text, marginBottom: 2 },
  service: { fontSize: 14, color: Colors.textMuted, marginBottom: 6 },
  symptoms: { fontSize: 13, color: Colors.text, backgroundColor: Colors.background, borderRadius: 6, padding: 8, marginBottom: 8 },
  time: { fontSize: 12, color: Colors.textMuted, marginBottom: 12 },
  actions: { flexDirection: 'row', gap: 10 },
  btn: { flex: 1, paddingVertical: 12, borderRadius: 10, alignItems: 'center' },
  acceptBtn: { backgroundColor: Colors.primary },
  declineBtn: { borderWidth: 1.5, borderColor: Colors.error },
  acceptBtnText: { color: Colors.white, fontWeight: '700', fontSize: 15 },
  declineBtnText: { color: Colors.error, fontWeight: '700', fontSize: 15 },
});
