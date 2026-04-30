import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import { Colors } from '../../constants/colors';
import { ProviderCard } from '../../components/booking/ProviderCard';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { providerService } from '../../services/providerService';
import { PatientStackParamList } from '../../navigation/PatientNavigator';
import { ProviderWithDistance } from '../../types';
import { useBookingStore } from '../../store/bookingStore';
import { BookingMode } from '../../types';
import { formatCurrency } from '../../utils/format';
import { getCurrentLocation, MOCK_LOCATION } from '../../utils/location';

type Props = {
  navigation: NativeStackNavigationProp<PatientStackParamList, 'ProviderList'>;
  route: RouteProp<PatientStackParamList, 'ProviderList'>;
};

export const ProviderListScreen: React.FC<Props> = ({ navigation, route }) => {
  const { categorySlug, serviceId, lat, lng, mode } = route.params;
  const isHomeVisit = mode === 'HOME_VISIT';
  const isClinicVisit = mode === 'DOCTOR_PLACE';
  const isVideoMode = mode === 'VIDEO_CONSULTATION';
  const [sortBy, setSortBy] = useState<'distance' | 'fee'>('distance');
  const [resolvedLat, setResolvedLat] = useState<number | undefined>(lat ?? undefined);
  const [resolvedLng, setResolvedLng] = useState<number | undefined>(lng ?? undefined);
  const [locationReady, setLocationReady] = useState<boolean>(lat != null && lng != null);
  const { setSelectedProvider, setSelectedMode } = useBookingStore();

  // Resolve location if not already provided
  useEffect(() => {
    if (lat == null) {
      getCurrentLocation()
        .then((loc) => {
          const resolved = loc ?? MOCK_LOCATION;
          setResolvedLat(resolved.lat);
          setResolvedLng(resolved.lng);
        })
        .catch(() => {
          setResolvedLat(MOCK_LOCATION.lat);
          setResolvedLng(MOCK_LOCATION.lng);
        })
        .finally(() => setLocationReady(true));
    }
  }, [lat]);

  const { data: providers, isLoading } = useQuery<ProviderWithDistance[]>({
    queryKey: ['nearby-providers', categorySlug, serviceId, resolvedLat, resolvedLng, mode],
    enabled: locationReady,
    queryFn: () =>
      providerService.getNearbyProviders({
        lat: resolvedLat,
        lng: resolvedLng,
        serviceCategory: categorySlug,
        serviceId,
        mode,
      }),
  });

  const sortedProviders = [...(providers || [])].sort((a, b) => {
    if (sortBy === 'fee') {
      if (isHomeVisit) return a.consultationFeeHomeVisit - b.consultationFeeHomeVisit;
      return a.consultationFeeDoctorPlace - b.consultationFeeDoctorPlace;
    }
    return a.distance - b.distance;
  });

  const navigateToConfirm = (
    provider: ProviderWithDistance,
    bookingMode: BookingMode,
    fee: number,
  ) => {
    setSelectedProvider(provider);
    setSelectedMode(bookingMode);
    navigation.navigate('BookingConfirm', { providerId: provider.id, mode: bookingMode, fee });
  };

  const handleSelectProvider = (provider: ProviderWithDistance) => {
    // If a mode was pre-selected (coming from HomeScreen service type tiles),
    // navigate directly without asking the user again.
    if (mode) {
      const fee = mode === 'HOME_VISIT'
        ? provider.consultationFeeHomeVisit
        : mode === 'VIDEO_CONSULTATION'
        ? provider.consultationFeeVideoConsultation
        : provider.consultationFeeDoctorPlace;
      navigateToConfirm(provider, mode, fee);
      return;
    }

    // Fallback: ask the user which mode to use (legacy behaviour when no mode preset)
    const modes: { label: string; mode: BookingMode; fee: number }[] = [];

    if (provider.homeVisitEnabled) {
      modes.push({
        label: `🏠 Home Visit — ${formatCurrency(provider.consultationFeeHomeVisit)}`,
        mode: 'HOME_VISIT',
        fee: provider.consultationFeeHomeVisit,
      });
    }
    if (provider.doctorPlaceVisitEnabled) {
      modes.push({
        label: `🏥 Clinic Visit — ${formatCurrency(provider.consultationFeeDoctorPlace)}`,
        mode: 'DOCTOR_PLACE',
        fee: provider.consultationFeeDoctorPlace,
      });
    }
    if (provider.videoConsultationEnabled) {
      modes.push({
        label: `📹 Video Consultation — ${formatCurrency(provider.consultationFeeVideoConsultation)}`,
        mode: 'VIDEO_CONSULTATION',
        fee: provider.consultationFeeVideoConsultation,
      });
    }

    if (modes.length === 0) return;

    if (modes.length === 1) {
      navigateToConfirm(provider, modes[0].mode, modes[0].fee);
      return;
    }

    Alert.alert(
      'Select Booking Mode',
      `How would you like to consult Dr. ${provider.name}?`,
      [
        ...modes.map(({ label, mode: m, fee }) => ({
          text: label,
          onPress: () => navigateToConfirm(provider, m, fee),
        })),
        { text: 'Cancel', style: 'cancel' as const },
      ],
    );
  };

  const modeLabel = isHomeVisit
    ? '🏠 Home Visit Doctors'
    : isClinicVisit
    ? '🏥 Clinic Visit Doctors'
    : isVideoMode
    ? '📹 Video Consultation Doctors'
    : 'Nearby Providers';

  const emptySubtitle = isHomeVisit
    ? 'No doctors available for home visits in your area.'
    : isClinicVisit
    ? 'No clinics found near your location.'
    : isVideoMode
    ? 'No doctors available for video consultations right now.'
    : 'No available providers in your area. Try expanding your search.';

  if (!locationReady || isLoading) {
    return <LoadingSpinner fullScreen message="Finding providers near you…" />;
  }

  return (
    <View style={styles.container}>
      {/* Mode banner */}
      {mode && (
        <View style={[
          styles.modeBanner,
          isVideoMode && styles.modeBannerVideo,
          isHomeVisit && styles.modeBannerHome,
          isClinicVisit && styles.modeBannerClinic,
        ]}>
          <Text style={styles.modeBannerText}>{modeLabel}</Text>
          {isVideoMode && (
            <Text style={styles.modeBannerSub}>Distance is not a factor — all available doctors shown</Text>
          )}
          {(isHomeVisit || isClinicVisit) && (
            <Text style={styles.modeBannerSub}>Sorted by distance from your location</Text>
          )}
        </View>
      )}

      <View style={styles.filterBar}>
        {!isVideoMode && (
          <TouchableOpacity
            style={[styles.filterBtn, sortBy === 'distance' && styles.filterBtnActive]}
            onPress={() => setSortBy('distance')}
          >
            <Text style={[styles.filterBtnText, sortBy === 'distance' && styles.filterBtnTextActive]}>
              📍 Distance
            </Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity
          style={[styles.filterBtn, sortBy === 'fee' && styles.filterBtnActive]}
          onPress={() => setSortBy('fee')}
        >
          <Text style={[styles.filterBtnText, sortBy === 'fee' && styles.filterBtnTextActive]}>
            💰 Fee
          </Text>
        </TouchableOpacity>

        {categorySlug && !isVideoMode && resolvedLat != null && resolvedLng != null && (
          <TouchableOpacity
            style={styles.recommendBtn}
            onPress={() =>
              navigation.navigate('Recommendation', {
                categorySlug,
                lat: resolvedLat,
                lng: resolvedLng,
              })
            }
          >
            <Text style={styles.recommendBtnText}>✨ Recommend</Text>
          </TouchableOpacity>
        )}
      </View>

      {sortedProviders.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyIcon}>🔍</Text>
          <Text style={styles.emptyTitle}>No providers found</Text>
          <Text style={styles.emptySubtitle}>{emptySubtitle}</Text>
        </View>
      ) : (
        <FlatList
          data={sortedProviders}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <ProviderCard provider={item} onSelect={handleSelectProvider} />
          )}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  filterBar: {
    flexDirection: 'row',
    padding: 12,
    gap: 8,
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  filterBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  filterBtnActive: { backgroundColor: Colors.primaryLight, borderColor: Colors.primary },
  filterBtnText: { fontSize: 13, color: Colors.textMuted, fontWeight: '600' },
  filterBtnTextActive: { color: Colors.primary },
  recommendBtn: {
    marginLeft: 'auto',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: Colors.primary,
  },
  recommendBtnText: { fontSize: 13, color: Colors.white, fontWeight: '700' },
  list: { padding: 16 },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  emptyIcon: { fontSize: 48, marginBottom: 16 },
  emptyTitle: { fontSize: 20, fontWeight: '700', color: Colors.text, marginBottom: 8 },
  emptySubtitle: { fontSize: 14, color: Colors.textMuted, textAlign: 'center', lineHeight: 20 },
  modeBanner: {
    padding: 12,
    paddingHorizontal: 16,
    backgroundColor: Colors.primaryLight,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  modeBannerVideo: { backgroundColor: '#EFF6FF' },
  modeBannerHome: { backgroundColor: '#ECFDF5' },
  modeBannerClinic: { backgroundColor: '#F5F3FF' },
  modeBannerText: { fontSize: 15, fontWeight: '700', color: Colors.text },
  modeBannerSub: { fontSize: 12, color: Colors.textMuted, marginTop: 2 },
});
