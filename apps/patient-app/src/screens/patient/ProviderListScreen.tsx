import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
} from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import { Colors } from '../../constants/colors';
import { ProviderCard } from '../../components/booking/ProviderCard';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { Button } from '../../components/common/Button';
import { providerService } from '../../services/providerService';
import { PatientStackParamList } from '../../navigation/PatientNavigator';
import { ProviderWithDistance } from '../../types';
import { useBookingStore } from '../../store/bookingStore';

type Props = {
  navigation: NativeStackNavigationProp<PatientStackParamList, 'ProviderList'>;
  route: RouteProp<PatientStackParamList, 'ProviderList'>;
};

export const ProviderListScreen: React.FC<Props> = ({ navigation, route }) => {
  const { categorySlug, lat, lng } = route.params;
  const [sortBy, setSortBy] = useState<'distance' | 'fee'>('distance');
  const { setSelectedProvider, setSelectedMode } = useBookingStore();

  const { data: providers, isLoading, isError, refetch } = useQuery<ProviderWithDistance[]>({
    queryKey: ['nearby-providers', categorySlug, lat, lng],
    queryFn: () => providerService.getNearbyProviders({ lat, lng, serviceCategory: categorySlug }),
  });

  const sortedProviders = [...(providers || [])].sort((a, b) => {
    if (sortBy === 'distance') return a.distance - b.distance;
    return a.consultationFeeHomeVisit - b.consultationFeeHomeVisit;
  });

  const handleSelectProvider = (provider: ProviderWithDistance) => {
    setSelectedProvider(provider);
    if (provider.homeVisitEnabled) {
      setSelectedMode('HOME_VISIT');
    } else {
      setSelectedMode('DOCTOR_PLACE');
    }
    navigation.navigate('BookingConfirm', {
      providerId: provider.id,
      mode: provider.homeVisitEnabled ? 'HOME_VISIT' : 'DOCTOR_PLACE',
      fee: provider.homeVisitEnabled
        ? provider.consultationFeeHomeVisit
        : provider.consultationFeeDoctorPlace,
    });
  };

  if (isLoading) return <LoadingSpinner fullScreen message="Finding providers..." />;

  if (isError) {
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyIcon}>⚠️</Text>
        <Text style={styles.emptyTitle}>Something went wrong</Text>
        <Text style={styles.emptySubtitle}>
          We couldn't load nearby providers. Please check your connection and try again.
        </Text>
        <Button title="Retry" onPress={() => refetch()} style={{ marginTop: 16 }} />
      </View>
    );
  }

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
