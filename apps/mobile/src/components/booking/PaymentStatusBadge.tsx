import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { PaymentStatus } from '../../types';
import { Colors } from '../../constants/colors';
const CONFIG: Record<PaymentStatus, { label: string; color: string; bg: string }> = {
  PENDING: { label: 'Payment Pending', color: Colors.warning, bg: '#FEF3C7' },
  PAID: { label: 'Paid', color: Colors.success, bg: '#D1FAE5' },
  REFUNDED: { label: 'Refunded', color: Colors.secondary, bg: '#DBEAFE' },
  FAILED: { label: 'Payment Failed', color: Colors.error, bg: '#FEE2E2' },
};
export const PaymentStatusBadge: React.FC<{ status: PaymentStatus }> = ({ status }) => {
  const c = CONFIG[status] || CONFIG.PENDING;
  return <View style={[styles.badge, { backgroundColor: c.bg }]}><Text style={[styles.text, { color: c.color }]}>{c.label}</Text></View>;
};
const styles = StyleSheet.create({
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  text: { fontSize: 12, fontWeight: '600' },
});
