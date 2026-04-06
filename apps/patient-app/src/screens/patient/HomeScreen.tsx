import React from 'react';
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
import { ServiceCategoryCard } from '../../components/home/ServiceCategoryCard';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { useAuthStore } from '../../store/authStore';
import { serviceService } from '../../services/serviceService';
import api from '../../services/api';
import { ServiceCategory } from '../../types';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { PatientStackParamList } from '../../navigation/PatientNavigator';
import { useNavigation } from '@react-navigation/native';

type Nav = NativeStackNavigationProp<PatientStackParamList>;

export const HomeScreen: React.FC = () => {
  const navigation = useNavigation<Nav>();
  const { user } = useAuthStore();

  const {
    data: services,
    isLoading,
    isError,
    refetch,
    isRefetching,
  } = useQuery<ServiceCategory[]>({
    queryKey: ['services'],
    queryFn: serviceService.getCategories,
  });

  const { data: recentBookings } = useQuery({
    queryKey: ['patient-bookings'],
    queryFn: async () => {
      const res = await api.get('/patients/me/bookings');
      return res.data;
    },
  });

  const handleServicePress = (category: ServiceCategory) => {
    navigation.navigate('SelectService', { category });
  };

  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} />}
    >
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>Hello 👋</Text>
          <Text style={styles.name}>{user?.phone || 'User'}</Text>
        </View>
        <TouchableOpacity style={styles.emergency}>
          <Text style={styles.emergencyText}>🚨 Emergency</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.searchBanner}>
        <Text style={styles.searchBannerTitle}>How can we help you today?</Text>
        <Text style={styles.searchBannerSubtitle}>
          Book a doctor, nurse, or therapist at home or clinic
        </Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Services</Text>
        {isLoading ? (
          <LoadingSpinner message="Loading services..." />
        ) : isError ? (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>Unable to load services</Text>
            <TouchableOpacity style={styles.retryButton} onPress={() => refetch()}>
              <Text style={styles.retryText}>Tap to retry</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.servicesGrid}>
            {(services || []).map((category) => (
              <ServiceCategoryCard
                key={category.id}
                category={category}
                onPress={handleServicePress}
              />
            ))}
          </View>
        )}
      </View>

      {recentBookings && recentBookings.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Recent Bookings</Text>
          {recentBookings.slice(0, 3).map((booking: any) => (
            <TouchableOpacity
              key={booking.id}
              style={styles.bookingItem}
              onPress={() => navigation.navigate('Tracking', { bookingId: booking.id })}
            >
              <View>
                <Text style={styles.bookingProvider}>{booking.provider?.name || 'Provider'}</Text>
                <Text style={styles.bookingService}>{booking.serviceCategory?.name}</Text>
              </View>
              <View>
                <Text style={[styles.bookingStatus, { color: Colors.primary }]}>
                  {booking.status}
                </Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>
      )}

      <View style={{ height: 24 }} />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    paddingTop: 60,
    backgroundColor: Colors.primary,
  },
  greeting: { fontSize: 14, color: 'rgba(255,255,255,0.8)' },
  name: { fontSize: 20, fontWeight: '700', color: Colors.white },
  emergency: {
    backgroundColor: Colors.error,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
  },
  emergencyText: { color: Colors.white, fontWeight: '700', fontSize: 13 },
  searchBanner: {
    backgroundColor: Colors.primary,
    padding: 20,
    paddingTop: 0,
    paddingBottom: 28,
  },
  searchBannerTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: Colors.white,
    marginBottom: 4,
  },
  searchBannerSubtitle: { fontSize: 14, color: 'rgba(255,255,255,0.8)' },
  section: { padding: 20 },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 16,
  },
  servicesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  bookingItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: Colors.white,
    borderRadius: 10,
    padding: 14,
    marginBottom: 8,
    elevation: 2,
  },
  bookingProvider: { fontWeight: '600', color: Colors.text, marginBottom: 2 },
  bookingService: { fontSize: 13, color: Colors.textMuted },
  bookingStatus: { fontWeight: '600', fontSize: 13 },
  errorContainer: {
    alignItems: 'center',
    padding: 24,
    backgroundColor: Colors.white,
    borderRadius: 12,
  },
  errorText: {
    fontSize: 14,
    color: Colors.error,
    marginBottom: 12,
  },
  retryButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: Colors.primary,
    borderRadius: 8,
  },
  retryText: {
    color: Colors.white,
    fontWeight: '600',
    fontSize: 14,
  },
});
