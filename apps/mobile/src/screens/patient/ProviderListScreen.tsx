import React, { useState } from 'react';
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

type Props = {
  navigation: NativeStackNavigationProp<PatientStackParamList, 'ProviderList'>;
  route: RouteProp<PatientStackParamList, 'ProviderList'>;
};

export const ProviderListScreen: React.FC<Props> = ({ navigation, route }) => {
  const { categorySlug, lat, lng } = route.params;
  const [sortBy, setSortBy] = useState<'distance' | 'fee'>('distance');
  const { setSelectedProvider, setSelectedMode } = useBookingStore();

  const { data: providers, isLoading } = useQuery<ProviderWithDistance[]>({
    queryKey: ['nearby-providers', categorySlug, lat, lng],
    queryFn: () => providerService.getNearbyProviders({ lat, lng, serviceCategory: categorySlug }),
  });

  const sortedProviders = [...(providers || [])].sort((a, b) => {
    if (sortBy === 'distance') return a.distance - b.distance;
    return a.consultationFeeHomeVisit - b.consultationFeeHomeVisit;
  });

  const navigateToConfirm = (
    provider: ProviderWithDistance,
    mode: BookingMode,
    fee: number,
  ) => {
    setSelectedProvider(provider);
    setSelectedMode(mode);
    navigation.navigate('BookingConfirm', { providerId: provider.id, mode, fee });
  };

  const handleSelectProvider = (provider: ProviderWithDistance) => {
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
        ...modes.map(({ label, mode, fee }) => ({
          text: label,
          onPress: () => navigateToConfirm(provider, mode, fee),
        })),
        { text: 'Cancel', style: 'cancel' as const },
      ],
    );
  };

  if (isLoading) return <LoadingSpinner fullScreen message="Finding providers..." />;

  return (
    <View style={styles.container}>
      <View style={styles.filterBar}>
        <TouchableOpacity
          style={[styles.filterBtn, sortBy === 'distance' && styles.filterBtnActive]}
          onPress={() => setSortBy('distance')}
        >
          <Text style={[styles.filterBtnText, sortBy === 'distance' && styles.filterBtnTextActive]}>
            📍 Distance
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.filterBtn, sortBy === 'fee' && styles.filterBtnActive]}
          onPress={() => setSortBy('fee')}
        >
          <Text style={[styles.filterBtnText, sortBy === 'fee' && styles.filterBtnTextActive]}>
            💰 Fee
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.recommendBtn}
          onPress={() =>
            navigation.navigate('Recommendation', {
              categorySlug,
              lat,
              lng,
            })
          }
        >
          <Text style={styles.recommendBtnText}>✨ Recommend</Text>
        </TouchableOpacity>
      </View>

      {sortedProviders.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyIcon}>🔍</Text>
          <Text style={styles.emptyTitle}>No providers found</Text>
          <Text style={styles.emptySubtitle}>
            No available providers in your area. Try expanding your search.
          </Text>
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
});
