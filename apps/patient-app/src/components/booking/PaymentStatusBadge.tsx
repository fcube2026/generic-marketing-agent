import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { PaymentStatus } from '../../types';
import { Colors } from '../../constants/colors';

const STATUS_CONFIG: Record<PaymentStatus, { label: string; color: string; bg: string }> = {
  PENDING: { label: 'Payment Pending', color: Colors.warning, bg: '#FEF3C7' },
  PAID: { label: 'Paid', color: Colors.success, bg: '#D1FAE5' },
  REFUNDED: { label: 'Refunded', color: Colors.secondary, bg: '#DBEAFE' },
  FAILED: { label: 'Payment Failed', color: Colors.error, bg: '#FEE2E2' },
};

interface PaymentStatusBadgeProps {
  status: PaymentStatus;
}

export const PaymentStatusBadge: React.FC<PaymentStatusBadgeProps> = ({ status }) => {
  const config = STATUS_CONFIG[status] || STATUS_CONFIG.PENDING;
  return (
    <View style={[styles.badge, { backgroundColor: config.bg }]}>
      <Text style={[styles.text, { color: config.color }]}>{config.label}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  text: { fontSize: 12, fontWeight: '600' },
});
