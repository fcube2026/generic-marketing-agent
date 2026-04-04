import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { Colors } from '../../constants/colors';
import { Card } from '../../components/common/Card';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { bookingService } from '../../services/bookingService';
import { formatCurrency, formatDate } from '../../utils/format';
import { Booking } from '../../types';

const PERIOD_TABS = [
  { key: 'week', label: 'This Week' },
  { key: 'month', label: 'This Month' },
  { key: 'all', label: 'All Time' },
] as const;

type PeriodKey = (typeof PERIOD_TABS)[number]['key'];

const PROVIDER_SHARE = 0.8; // 80% of total fee goes to provider

function getStartOfWeek(): Date {
  const now = new Date();
  const day = now.getDay();
  const diff = day === 0 ? 6 : day - 1;
  const start = new Date(now);
  start.setDate(now.getDate() - diff);
  start.setHours(0, 0, 0, 0);
  return start;
}

function getStartOfMonth(): Date {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), 1);
}

export const EarningsScreen: React.FC = () => {
  const [activePeriod, setActivePeriod] = useState<PeriodKey>('month');

  const {
    data: bookings = [],
    isLoading,
    refetch,
    isRefetching,
  } = useQuery<Booking[]>({
    queryKey: ['provider-bookings-earnings'],
    queryFn: bookingService.getProviderBookings,
  });

  const completedBookings = bookings.filter((b) =>
    ['COMPLETED', 'SUMMARY_SUBMITTED', 'CLOSED'].includes(b.status)
  );

  const filteredBookings = useMemo(() => {
    if (activePeriod === 'all') return completedBookings;

    const cutoff = activePeriod === 'week' ? getStartOfWeek() : getStartOfMonth();
    return completedBookings.filter(
      (b) => new Date(b.createdAt).getTime() >= cutoff.getTime()
    );
  }, [completedBookings, activePeriod]);

  const totalEarnings = useMemo(
    () => completedBookings.reduce((sum, b) => sum + b.totalFee * PROVIDER_SHARE, 0),
    [completedBookings]
  );

  const periodEarnings = useMemo(
    () => filteredBookings.reduce((sum, b) => sum + b.totalFee * PROVIDER_SHARE, 0),
    [filteredBookings]
  );

  const pendingPayout = useMemo(
    () =>
      completedBookings
        .filter((b) => b.status !== 'CLOSED')
        .reduce((sum, b) => sum + b.totalFee * PROVIDER_SHARE, 0),
    [completedBookings]
  );

  const sortedEarnings = [...filteredBookings].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  if (isLoading) return <LoadingSpinner fullScreen />;

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={Colors.primary} />
      }
    >
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>💰 Earnings</Text>
      </View>

      {/* Summary Cards */}
      <View style={styles.summaryRow}>
        <Card style={styles.summaryCard} padding={16}>
          <Text style={styles.summaryLabel}>Total Earned</Text>
          <Text style={styles.summaryValue}>{formatCurrency(totalEarnings)}</Text>
          <Text style={styles.summaryNote}>
            {completedBookings.length} consultation{completedBookings.length !== 1 ? 's' : ''}
          </Text>
        </Card>
        <Card style={styles.summaryCard} padding={16}>
          <Text style={styles.summaryLabel}>Pending Payout</Text>
          <Text style={[styles.summaryValue, { color: Colors.warning }]}>
            {formatCurrency(pendingPayout)}
          </Text>
          <Text style={styles.summaryNote}>Being processed</Text>
        </Card>
      </View>

      {/* Period Earnings Card */}
      <Card style={styles.periodCard} padding={20}>
        <Text style={styles.periodEarningLabel}>
          {activePeriod === 'week' ? "This Week's" : activePeriod === 'month' ? "This Month's" : 'All Time'} Earnings
        </Text>
        <Text style={styles.periodEarningValue}>{formatCurrency(periodEarnings)}</Text>
        <Text style={styles.periodCount}>
          {filteredBookings.length} booking{filteredBookings.length !== 1 ? 's' : ''}
        </Text>
      </Card>

      {/* Period Filter Tabs */}
      <View style={styles.periodRow}>
        {PERIOD_TABS.map((tab) => (
          <TouchableOpacity
            key={tab.key}
            style={[styles.periodTab, activePeriod === tab.key && styles.periodTabActive]}
            onPress={() => setActivePeriod(tab.key)}
          >
            <Text
              style={[
                styles.periodTabText,
                activePeriod === tab.key && styles.periodTabTextActive,
              ]}
            >
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Earnings Breakdown */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Earnings Breakdown</Text>

        {sortedEarnings.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>📊</Text>
            <Text style={styles.emptyText}>No earnings in this period yet.</Text>
          </View>
        ) : (
          sortedEarnings.map((booking) => (
            <View key={booking.id} style={styles.earningItem}>
              <View style={styles.earningLeft}>
                <Text style={styles.earningPatient}>{booking.patient?.name || 'Patient'}</Text>
                <Text style={styles.earningService}>{booking.serviceCategory?.name}</Text>
                <Text style={styles.earningDate}>{formatDate(booking.createdAt)}</Text>
              </View>
              <View style={styles.earningRight}>
                <Text style={styles.earningAmount}>
                  {formatCurrency(booking.totalFee * PROVIDER_SHARE)}
                </Text>
                <Text style={styles.earningMode}>
                  {booking.mode === 'HOME_VISIT' ? '🏠' : '🏥'}
                </Text>
              </View>
            </View>
          ))
        )}
      </View>

      {/* Payout Info */}
      <Card style={styles.payoutInfoCard} padding={16}>
        <Text style={styles.payoutInfoTitle}>ℹ️ Payout Information</Text>
        <Text style={styles.payoutInfoText}>
          Payouts are processed within 3–5 business days after booking closure.
          You receive {PROVIDER_SHARE * 100}% of the consultation fee.
        </Text>
      </Card>

      <View style={{ height: 40 }} />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: {
    backgroundColor: Colors.primary,
    padding: 20,
    paddingTop: 60,
  },
  headerTitle: { fontSize: 22, fontWeight: '800', color: Colors.white },
  summaryRow: {
    flexDirection: 'row',
    padding: 16,
    gap: 10,
  },
  summaryCard: { flex: 1 },
  summaryLabel: { fontSize: 12, color: Colors.textMuted, fontWeight: '600', textTransform: 'uppercase' },
  summaryValue: { fontSize: 22, fontWeight: '800', color: Colors.primary, marginTop: 4 },
  summaryNote: { fontSize: 11, color: Colors.textMuted, marginTop: 4 },
  periodCard: {
    marginHorizontal: 16,
    marginBottom: 12,
    alignItems: 'center',
    backgroundColor: Colors.primaryLight,
    borderRadius: 14,
  },
  periodEarningLabel: { fontSize: 13, color: Colors.primaryDark, fontWeight: '600' },
  periodEarningValue: { fontSize: 32, fontWeight: '800', color: Colors.primary, marginVertical: 6 },
  periodCount: { fontSize: 13, color: Colors.textMuted },
  periodRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 8,
    marginBottom: 16,
  },
  periodTab: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: Colors.white,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  periodTabActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  periodTabText: { fontSize: 13, fontWeight: '600', color: Colors.textMuted },
  periodTabTextActive: { color: Colors.white },
  section: { paddingHorizontal: 16 },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 12,
  },
  earningItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: Colors.white,
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
    elevation: 1,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 },
  },
  earningLeft: {},
  earningPatient: { fontSize: 15, fontWeight: '600', color: Colors.text },
  earningService: { fontSize: 12, color: Colors.textMuted, marginTop: 2 },
  earningDate: { fontSize: 11, color: Colors.textMuted, marginTop: 2 },
  earningRight: { alignItems: 'flex-end' },
  earningAmount: { fontSize: 16, fontWeight: '800', color: Colors.primary },
  earningMode: { fontSize: 14, marginTop: 2 },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  emptyIcon: { fontSize: 40, marginBottom: 8 },
  emptyText: { fontSize: 14, color: Colors.textMuted },
  payoutInfoCard: {
    marginHorizontal: 16,
    marginTop: 16,
    backgroundColor: '#F0FDFA',
    borderRadius: 14,
  },
  payoutInfoTitle: { fontSize: 14, fontWeight: '700', color: Colors.text, marginBottom: 6 },
  payoutInfoText: { fontSize: 13, color: Colors.textMuted, lineHeight: 20 },
});
