import React from 'react';
import { View, Text, StyleSheet, SectionList, TouchableOpacity } from 'react-native';
import { useInfiniteQuery } from '@tanstack/react-query';
import { Colors } from '../../constants/colors';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { Card } from '../../components/common/Card';
import api from '../../services/api';
import { ENDPOINTS } from '../../constants/api';
import { ConsultationSummary, ConsultationSummariesResponse } from '../../types';
import { formatDate } from '../../utils/format';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { PatientStackParamList } from '../../navigation/PatientNavigator';

type Nav = NativeStackNavigationProp<PatientStackParamList>;

const PAGE_LIMIT = 10;

interface Section {
  title: string;
  data: ConsultationSummary[];
}

const groupByDate = (summaries: ConsultationSummary[]): Section[] => {
  const groups: Record<string, ConsultationSummary[]> = {};

  summaries.forEach((s) => {
    const dateKey = formatDate(s.createdAt);
    if (!groups[dateKey]) groups[dateKey] = [];
    groups[dateKey].push(s);
  });

  return Object.entries(groups).map(([title, data]) => ({ title, data }));
};

export const ConsultationSummariesScreen: React.FC = () => {
  const navigation = useNavigation<Nav>();

  const {
    data,
    isLoading,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteQuery<ConsultationSummariesResponse>({
    queryKey: ['patient-consultation-summaries'],
    queryFn: async ({ pageParam = 1 }) => {
      const res = await api.get(ENDPOINTS.CONSULTATION_PATIENT_SUMMARIES, {
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

  const allSummaries = data?.pages.flatMap((p) => p.data) ?? [];
  const sections = groupByDate(allSummaries);

  if (isLoading) return <LoadingSpinner fullScreen message="Loading summaries..." />;

  if (allSummaries.length === 0) {
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyIcon}>📋</Text>
        <Text style={styles.emptyTitle}>No Consultation Summaries</Text>
        <Text style={styles.emptySubtitle}>
          Your consultation summaries will appear here after your appointments are completed.
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
      renderItem={({ item }) => (
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={() =>
            navigation.navigate('ConsultationSummary', { bookingId: item.bookingId })
          }
        >
          <Card style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={styles.providerName}>
                {item.booking?.provider?.name || 'Provider'}
              </Text>
              <Text style={styles.serviceName}>
                {item.booking?.serviceCategory?.name || ''}
              </Text>
            </View>

            {item.diagnosis ? (
              <View style={styles.diagnosisRow}>
                <Text style={styles.diagnosisLabel}>Diagnosis</Text>
                <Text style={styles.diagnosisValue} numberOfLines={2}>
                  {item.diagnosis}
                </Text>
              </View>
            ) : null}

            {item.symptoms ? (
              <Text style={styles.symptoms} numberOfLines={1}>
                Symptoms: {item.symptoms}
              </Text>
            ) : null}

            {item.medicinesAdvised &&
            Array.isArray(item.medicinesAdvised) &&
            item.medicinesAdvised.length > 0 ? (
              <View style={styles.medicinesBadge}>
                <Text style={styles.medicinesBadgeText}>
                  💊 {item.medicinesAdvised.length} medicine
                  {item.medicinesAdvised.length > 1 ? 's' : ''} prescribed
                </Text>
              </View>
            ) : null}

            {item.followUpRecommendation ? (
              <View style={styles.followUp}>
                <Text style={styles.followUpText}>
                  📅 Follow-up: {item.followUpRecommendation}
                </Text>
              </View>
            ) : null}
          </Card>
        </TouchableOpacity>
      )}
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
    marginBottom: 10,
  },
  providerName: { fontSize: 16, fontWeight: '700', color: Colors.text },
  serviceName: { fontSize: 12, color: Colors.textMuted },
  diagnosisRow: { marginBottom: 8 },
  diagnosisLabel: {
    fontSize: 11,
    color: Colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 2,
    fontWeight: '600',
  },
  diagnosisValue: { fontSize: 14, color: Colors.text, lineHeight: 20 },
  symptoms: { fontSize: 13, color: Colors.textMuted, marginBottom: 8 },
  medicinesBadge: {
    backgroundColor: Colors.primaryLight,
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    alignSelf: 'flex-start',
    marginBottom: 8,
  },
  medicinesBadgeText: { fontSize: 12, color: Colors.primary, fontWeight: '600' },
  followUp: {
    backgroundColor: '#FEF3C7',
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    alignSelf: 'flex-start',
  },
  followUpText: { fontSize: 12, color: Colors.warning, fontWeight: '600' },
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
