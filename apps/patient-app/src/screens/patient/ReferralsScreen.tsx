import React from 'react';
import { View, Text, StyleSheet, SectionList } from 'react-native';
import { useInfiniteQuery } from '@tanstack/react-query';
import { Colors } from '../../constants/colors';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { Card } from '../../components/common/Card';
import api from '../../services/api';
import { ENDPOINTS } from '../../constants/api';
import { Referral, ReferralsResponse } from '../../types';
import { formatDate } from '../../utils/format';

const PAGE_LIMIT = 10;

interface Section {
  title: string;
  data: Referral[];
}

const groupByDate = (referrals: Referral[]): Section[] => {
  const groups: Record<string, Referral[]> = {};

  referrals.forEach((r) => {
    const dateKey = formatDate(r.createdAt);
    if (!groups[dateKey]) groups[dateKey] = [];
    groups[dateKey].push(r);
  });

  return Object.entries(groups).map(([title, data]) => ({ title, data }));
};

const statusColors: Record<string, { bg: string; text: string; label: string }> = {
  RECOMMENDED: { bg: '#FEF3C7', text: '#92400E', label: 'Recommended' },
  BOOKED: { bg: '#DBEAFE', text: '#1E40AF', label: 'Booked' },
  COMPLETED: { bg: '#D1FAE5', text: '#065F46', label: 'Completed' },
};

export const ReferralsScreen: React.FC = () => {
  const {
    data,
    isLoading,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteQuery<ReferralsResponse>({
    queryKey: ['patient-referrals'],
    queryFn: async ({ pageParam = 1 }) => {
      const res = await api.get(ENDPOINTS.REFERRALS_PATIENT, {
        params: { page: pageParam, limit: PAGE_LIMIT },
      });
      return res.data;
    },
    getNextPageParam: (lastPage) => {
      const totalPages = Math.ceil(lastPage.total / lastPage.limit);
      return lastPage.page < totalPages ? lastPage.page + 1 : undefined;
    },
    initialPageParam: 1,
  });

  const allReferrals = data?.pages.flatMap((p) => p.data) ?? [];
  const sections = groupByDate(allReferrals);

  if (isLoading) return <LoadingSpinner fullScreen message="Loading referrals..." />;

  if (allReferrals.length === 0) {
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyIcon}>🏥</Text>
        <Text style={styles.emptyTitle}>No Referrals</Text>
        <Text style={styles.emptySubtitle}>
          Specialist referrals from your providers will appear here.
        </Text>
      </View>
    );
  }

  return (
    <SectionList
      style={styles.container}
      sections={sections}
      keyExtractor={(item) => item.id}
      contentContainerStyle={styles.list}
      renderSectionHeader={({ section: { title } }) => (
        <Text style={styles.sectionHeader}>{title}</Text>
      )}
      renderItem={({ item }) => {
        const statusConfig = statusColors[item.status] || statusColors.RECOMMENDED;
        return (
          <Card style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={styles.specialistType}>{item.specialistType}</Text>
              <View style={[styles.statusBadge, { backgroundColor: statusConfig.bg }]}>
                <Text style={[styles.statusText, { color: statusConfig.text }]}>
                  {statusConfig.label}
                </Text>
              </View>
            </View>

            <Text style={styles.providerName}>
              Referred by {item.booking?.provider?.name || 'Unknown Provider'}
            </Text>

            {item.booking?.serviceCategory?.name ? (
              <Text style={styles.serviceName}>
                {item.booking.serviceCategory.name}
              </Text>
            ) : null}

            {item.notes ? (
              <View style={styles.notesContainer}>
                <Text style={styles.notesLabel}>Notes</Text>
                <Text style={styles.notesText}>{item.notes}</Text>
              </View>
            ) : null}
          </Card>
        );
      }}
      onEndReached={() => {
        if (hasNextPage && !isFetchingNextPage) {
          fetchNextPage();
        }
      }}
      onEndReachedThreshold={0.3}
      ListFooterComponent={
        isFetchingNextPage ? (
          <LoadingSpinner message="Loading more..." />
        ) : null
      }
    />
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  list: { padding: 16 },
  sectionHeader: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: 16,
    marginBottom: 8,
    paddingHorizontal: 4,
  },
  card: { marginBottom: 12 },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  specialistType: { fontSize: 16, fontWeight: '700', color: Colors.text },
  statusBadge: {
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  statusText: { fontSize: 12, fontWeight: '600' },
  providerName: { fontSize: 13, color: Colors.textMuted, marginBottom: 4 },
  serviceName: { fontSize: 12, color: Colors.textMuted, marginBottom: 8 },
  notesContainer: {
    backgroundColor: Colors.primaryLight,
    borderRadius: 8,
    padding: 10,
    marginTop: 8,
  },
  notesLabel: {
    fontSize: 11,
    color: Colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
    fontWeight: '600',
  },
  notesText: { fontSize: 13, color: Colors.text, lineHeight: 18 },
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    backgroundColor: Colors.background,
  },
  emptyIcon: { fontSize: 48, marginBottom: 16 },
  emptyTitle: { fontSize: 20, fontWeight: '700', color: Colors.text, marginBottom: 8 },
  emptySubtitle: { fontSize: 14, color: Colors.textMuted, textAlign: 'center', lineHeight: 20 },
});
