import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { BookingStatus } from '../../types';
import { Colors } from '../../constants/colors';

const STATUS_CONFIG: Record<BookingStatus, { label: string; color: string; bg: string }> = {
  REQUESTED: { label: 'Requested', color: Colors.warning, bg: '#FEF3C7' },
  ACCEPTED: { label: 'Accepted', color: Colors.success, bg: '#D1FAE5' },
  DECLINED: { label: 'Declined', color: Colors.error, bg: '#FEE2E2' },
  ON_THE_WAY: { label: 'On the Way', color: Colors.secondary, bg: '#DBEAFE' },
  ARRIVED: { label: 'Arrived', color: Colors.primary, bg: Colors.primaryLight },
  IN_PROGRESS: { label: 'In Progress', color: Colors.primary, bg: Colors.primaryLight },
  COMPLETED: { label: 'Completed', color: Colors.success, bg: '#D1FAE5' },
  SUMMARY_SUBMITTED: { label: 'Summary Done', color: Colors.success, bg: '#D1FAE5' },
  CLOSED: { label: 'Closed', color: Colors.textMuted, bg: Colors.border },
  CANCELLED: { label: 'Cancelled', color: Colors.error, bg: '#FEE2E2' },
};

interface BookingStatusBadgeProps {
  status: BookingStatus;
}

export const BookingStatusBadge: React.FC<BookingStatusBadgeProps> = ({ status }) => {
  const config = STATUS_CONFIG[status] || STATUS_CONFIG.REQUESTED;
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
