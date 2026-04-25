import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import { Colors } from '../../constants/colors';
import { Button } from '../../components/common/Button';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { providerService } from '../../services/providerService';
import { PatientStackParamList } from '../../navigation/PatientNavigator';
import { formatCurrency, formatDistance, formatEta } from '../../utils/format';
import { RecommendationResponse } from '../../types';
import { Card } from '../../components/common/Card';

type Props = {
  navigation: NativeStackNavigationProp<PatientStackParamList, 'Recommendation'>;
  route: RouteProp<PatientStackParamList, 'Recommendation'>;
};

export const RecommendationScreen: React.FC<Props> = ({ navigation, route }) => {
  const { categorySlug, lat, lng } = route.params;

  const { data, isLoading } = useQuery<RecommendationResponse>({
    queryKey: ['recommendation', categorySlug, lat, lng],
    queryFn: () =>
      providerService.getRecommendation({
        lat,
        lng,
        serviceCategory: categorySlug,
        urgency: 'MEDIUM',
      }),
  });

  if (isLoading) return <LoadingSpinner fullScreen message="Finding best option for you..." />;

  if (!data || (!data.homeVisit && !data.doctorPlace)) {
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyIcon}>😔</Text>
        <Text style={styles.emptyTitle}>No providers available</Text>
        <Text style={styles.emptySubtitle}>
          No available providers found in your area right now.
        </Text>
      </View>
    );
  }

  const renderOption = (
    type: 'homeVisit' | 'doctorPlace' | 'videoConsultation',
    option: RecommendationResponse['homeVisit'],
    label: string,
    icon: string,
  ) => {
    if (!option) return null;
    const modeMap: Record<typeof type, string> = {
      homeVisit: 'HOME_VISIT',
      doctorPlace: 'DOCTOR_PLACE',
      videoConsultation: 'VIDEO_CONSULTATION',
    };
    const isRecommended = data.recommended === modeMap[type];

    return (
      <Card style={[styles.optionCard, isRecommended && styles.recommendedCard]}>
        {isRecommended && (
          <View style={styles.recommendedBadge}>
            <Text style={styles.recommendedBadgeText}>✨ Recommended</Text>
          </View>
        )}
        <Text style={styles.optionIcon}>{icon}</Text>
        <Text style={styles.optionLabel}>{label}</Text>
        <Text style={styles.providerName}>{option.provider.name}</Text>
        <Text style={styles.providerSpec}>{option.provider.specialization}</Text>
        <View style={styles.statsRow}>
          <View style={styles.stat}>
            <Text style={styles.statValue}>{type === 'videoConsultation' ? 'Online' : formatDistance(option.distance)}</Text>
            <Text style={styles.statLabel}>{type === 'videoConsultation' ? 'Location' : 'Distance'}</Text>
          </View>
          <View style={styles.stat}>
            <Text style={styles.statValue}>{type === 'videoConsultation' ? 'Instant' : formatEta(option.eta)}</Text>
            <Text style={styles.statLabel}>{type === 'videoConsultation' ? 'Availability' : 'ETA'}</Text>
          </View>
          <View style={styles.stat}>
            <Text style={[styles.statValue, { color: Colors.primary }]}>
              {formatCurrency(option.fee)}
            </Text>
            <Text style={styles.statLabel}>Fee</Text>
          </View>
        </View>
        <Button
          title={`Book ${label}`}
          onPress={() =>
            navigation.navigate('BookingConfirm', {
              providerId: option.provider.id,
              mode: modeMap[type] as 'HOME_VISIT' | 'DOCTOR_PLACE' | 'VIDEO_CONSULTATION',
              fee: option.fee,
            })
          }
          variant={isRecommended ? 'primary' : 'outline'}
          style={{ marginTop: 12 }}
        />
      </Card>
    );
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.reasonBanner}>
        <Text style={styles.reasonTitle}>💡 Our Recommendation</Text>
        <Text style={styles.reasonText}>{data.reason}</Text>
      </View>

      {renderOption('homeVisit', data.homeVisit, 'Home Visit', '🏠')}
      {renderOption('doctorPlace', data.doctorPlace, "Doctor's Clinic", '🏥')}
      {renderOption('videoConsultation', data.videoConsultation, 'Video Consultation', '📹')}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background, padding: 16 },
  reasonBanner: {
    backgroundColor: Colors.primaryLight,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderLeftWidth: 4,
    borderLeftColor: Colors.primary,
  },
  reasonTitle: { fontSize: 14, fontWeight: '700', color: Colors.primary, marginBottom: 6 },
  reasonText: { fontSize: 14, color: Colors.text, lineHeight: 20 },
  optionCard: { marginBottom: 16, position: 'relative', overflow: 'hidden' },
  recommendedCard: { borderWidth: 2, borderColor: Colors.primary },
  recommendedBadge: {
    position: 'absolute',
    top: 0,
    right: 0,
    backgroundColor: Colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderBottomLeftRadius: 12,
  },
  recommendedBadgeText: { color: Colors.white, fontSize: 11, fontWeight: '700' },
  optionIcon: { fontSize: 32, marginBottom: 8 },
  optionLabel: { fontSize: 13, color: Colors.textMuted, textTransform: 'uppercase', letterSpacing: 1 },
  providerName: { fontSize: 20, fontWeight: '700', color: Colors.text, marginTop: 4 },
  providerSpec: { fontSize: 14, color: Colors.textMuted, marginBottom: 16 },
  statsRow: { flexDirection: 'row', borderTopWidth: 1, borderTopColor: Colors.border, paddingTop: 12 },
  stat: { flex: 1, alignItems: 'center' },
  statValue: { fontSize: 16, fontWeight: '700', color: Colors.text },
  statLabel: { fontSize: 11, color: Colors.textMuted, marginTop: 2 },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  emptyIcon: { fontSize: 48, marginBottom: 16 },
  emptyTitle: { fontSize: 20, fontWeight: '700', color: Colors.text, marginBottom: 8 },
  emptySubtitle: { fontSize: 14, color: Colors.textMuted, textAlign: 'center' },
});
