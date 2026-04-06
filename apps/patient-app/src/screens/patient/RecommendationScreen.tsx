import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import { Colors } from '../../constants/colors';
import { Button } from '../../components/common/Button';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { providerService } from '../../services/providerService';
import { PatientStackParamList } from '../../navigation/PatientNavigator';
import { formatCurrency, formatDistance, formatEta } from '../../utils/format';
import { BookingMode, RecommendationResponse } from '../../types';
import { Card } from '../../components/common/Card';
import { useBookingStore } from '../../store/bookingStore';

type Props = {
  navigation: NativeStackNavigationProp<PatientStackParamList, 'Recommendation'>;
  route: RouteProp<PatientStackParamList, 'Recommendation'>;
};

export const RecommendationScreen: React.FC<Props> = ({ navigation, route }) => {
  const { categorySlug, lat, lng } = route.params;
  const [selectedOption, setSelectedOption] = useState<BookingMode | null>(null);
  const { setSelectedProvider, setSelectedMode } = useBookingStore();

  const { data, isLoading, isError } = useQuery<RecommendationResponse>({
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

  if (isError) {
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyIcon}>⚠️</Text>
        <Text style={styles.emptyTitle}>Something went wrong</Text>
        <Text style={styles.emptySubtitle}>
          We couldn&apos;t load recommendations. Please try again.
        </Text>
        <Button
          title="Go Back"
          onPress={() => navigation.goBack()}
          variant="outline"
          style={{ marginTop: 16 }}
        />
      </View>
    );
  }

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

  const handleSelect = (
    mode: BookingMode,
    provider: RecommendationResponse['homeVisit'],
  ) => {
    if (!provider) return;
    setSelectedOption(mode);
    setSelectedProvider(provider.provider);
    setSelectedMode(mode);
  };

  const handleConfirm = () => {
    if (!selectedOption) return;
    const option = selectedOption === 'HOME_VISIT' ? data.homeVisit : data.doctorPlace;
    if (!option) return;
    navigation.navigate('BookingConfirm', {
      providerId: option.provider.id,
      mode: selectedOption,
      fee: option.fee,
    });
  };

  const formatScore = (score: number): number => Math.round(score * 100);

  const renderOption = (
    type: 'homeVisit' | 'doctorPlace',
    option: RecommendationResponse['homeVisit'],
    label: string,
    icon: string,
  ) => {
    const mode: BookingMode = type === 'homeVisit' ? 'HOME_VISIT' : 'DOCTOR_PLACE';
    const isRecommended = data.recommended === mode;
    const isSelected = selectedOption === mode;
    const isDisabledBySelection = selectedOption !== null && !isSelected;

    if (!option) {
      return (
        <Card style={[styles.optionCard, styles.unavailableCard]}>
          <View style={styles.unavailableBadge}>
            <Text style={styles.unavailableBadgeText}>Not Available</Text>
          </View>
          <Text style={styles.optionIcon}>{icon}</Text>
          <Text style={[styles.optionLabel, styles.unavailableText]}>{label}</Text>
          <Text style={styles.unavailableMessage}>
            No providers available for {label.toLowerCase()} in your area right now.
          </Text>
        </Card>
      );
    }

    return (
      <TouchableOpacity
        activeOpacity={0.85}
        onPress={() => handleSelect(mode, option)}
        disabled={isDisabledBySelection}
      >
        <Card
          style={[
            styles.optionCard,
            isRecommended && styles.recommendedCard,
            isSelected && styles.selectedCard,
            isDisabledBySelection && styles.disabledCard,
          ]}
        >
          {isSelected && isRecommended ? (
            <View style={styles.recommendedBadge}>
              <Text style={styles.recommendedBadgeText}>✨ Selected</Text>
            </View>
          ) : isSelected ? (
            <View style={[styles.recommendedBadge, styles.selectedBadge]}>
              <Text style={styles.recommendedBadgeText}>✓ Selected</Text>
            </View>
          ) : isRecommended ? (
            <View style={styles.recommendedBadge}>
              <Text style={styles.recommendedBadgeText}>✨ Recommended</Text>
            </View>
          ) : null}
          <Text style={styles.optionIcon}>{icon}</Text>
          <Text style={[styles.optionLabel, isDisabledBySelection && styles.unavailableText]}>
            {label}
          </Text>
          <Text style={[styles.providerName, isDisabledBySelection && styles.unavailableText]}>
            {option.provider.name}
          </Text>
          <Text style={styles.providerSpec}>{option.provider.specialization}</Text>

          <View style={styles.scoreRow}>
            <Text style={styles.scoreLabel}>Match Score</Text>
            <View style={styles.scoreBarContainer}>
              <View
                style={[
                  styles.scoreBar,
                  {
                    width: `${formatScore(option.score)}%`,
                    backgroundColor: isRecommended ? Colors.primary : Colors.secondary,
                  },
                ]}
              />
            </View>
            <Text style={[styles.scoreValue, isRecommended && { color: Colors.primary }]}>
              {formatScore(option.score)}%
            </Text>
          </View>

          <View style={styles.statsRow}>
            <View style={styles.stat}>
              <Text style={[styles.statValue, isDisabledBySelection && styles.unavailableText]}>
                {formatDistance(option.distance)}
              </Text>
              <Text style={styles.statLabel}>Distance</Text>
            </View>
            <View style={styles.stat}>
              <Text style={[styles.statValue, isDisabledBySelection && styles.unavailableText]}>
                {formatEta(option.eta)}
              </Text>
              <Text style={styles.statLabel}>ETA</Text>
            </View>
            <View style={styles.stat}>
              <Text
                style={[
                  styles.statValue,
                  { color: isDisabledBySelection ? Colors.textMuted : Colors.primary },
                ]}
              >
                {formatCurrency(option.fee)}
              </Text>
              <Text style={styles.statLabel}>Fee</Text>
            </View>
          </View>
        </Card>
      </TouchableOpacity>
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

      {selectedOption && (
        <View style={styles.confirmSection}>
          <Button title="Proceed to Booking" onPress={handleConfirm} />
          <Button
            title="Change Selection"
            onPress={() => setSelectedOption(null)}
            variant="outline"
            style={{ marginTop: 10 }}
          />
        </View>
      )}

      {!selectedOption && (
        <Text style={styles.selectHint}>Tap a card to select your preferred option</Text>
      )}
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
  selectedCard: { borderWidth: 2, borderColor: Colors.success },
  disabledCard: { opacity: 0.5 },
  unavailableCard: { opacity: 0.6, borderWidth: 1, borderColor: Colors.border, borderStyle: 'dashed' },
  recommendedBadge: {
    position: 'absolute',
    top: 0,
    right: 0,
    backgroundColor: Colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderBottomLeftRadius: 12,
    zIndex: 1,
  },
  selectedBadge: { backgroundColor: Colors.success },
  unavailableBadge: {
    position: 'absolute',
    top: 0,
    right: 0,
    backgroundColor: Colors.textMuted,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderBottomLeftRadius: 12,
    zIndex: 1,
  },
  unavailableBadgeText: { color: Colors.white, fontSize: 11, fontWeight: '700' },
  recommendedBadgeText: { color: Colors.white, fontSize: 11, fontWeight: '700' },
  optionIcon: { fontSize: 32, marginBottom: 8 },
  optionLabel: { fontSize: 13, color: Colors.textMuted, textTransform: 'uppercase', letterSpacing: 1 },
  providerName: { fontSize: 20, fontWeight: '700', color: Colors.text, marginTop: 4 },
  providerSpec: { fontSize: 14, color: Colors.textMuted, marginBottom: 12 },
  unavailableText: { color: Colors.textMuted },
  unavailableMessage: {
    fontSize: 14,
    color: Colors.textMuted,
    marginTop: 8,
    lineHeight: 20,
  },
  scoreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  scoreLabel: { fontSize: 12, color: Colors.textMuted, marginRight: 8, width: 80 },
  scoreBarContainer: {
    flex: 1,
    height: 8,
    backgroundColor: Colors.border,
    borderRadius: 4,
    overflow: 'hidden',
  },
  scoreBar: { height: '100%', borderRadius: 4 },
  scoreValue: { fontSize: 14, fontWeight: '700', color: Colors.text, marginLeft: 8, width: 40 },
  statsRow: { flexDirection: 'row', borderTopWidth: 1, borderTopColor: Colors.border, paddingTop: 12 },
  stat: { flex: 1, alignItems: 'center' },
  statValue: { fontSize: 16, fontWeight: '700', color: Colors.text },
  statLabel: { fontSize: 11, color: Colors.textMuted, marginTop: 2 },
  confirmSection: { marginTop: 4, marginBottom: 24 },
  selectHint: {
    textAlign: 'center',
    color: Colors.textMuted,
    fontSize: 13,
    marginBottom: 24,
  },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  emptyIcon: { fontSize: 48, marginBottom: 16 },
  emptyTitle: { fontSize: 20, fontWeight: '700', color: Colors.text, marginBottom: 8 },
  emptySubtitle: { fontSize: 14, color: Colors.textMuted, textAlign: 'center' },
});
