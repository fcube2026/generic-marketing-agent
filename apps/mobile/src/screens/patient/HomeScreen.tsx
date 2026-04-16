import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  Alert,
} from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { Colors } from '../../constants/colors';
import { ServiceCategoryCard } from '../../components/home/ServiceCategoryCard';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { useAuthStore } from '../../store/authStore';
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
    refetch,
    isRefetching,
  } = useQuery<ServiceCategory[]>({
    queryKey: ['services'],
    queryFn: async () => {
      const res = await api.get('/services');
      return res.data;
    },
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

  const activeVideoBookings = (recentBookings || []).filter(
    (b: any) =>
      b.mode === 'VIDEO_CONSULTATION' &&
      ['REQUESTED', 'ACCEPTED', 'IN_PROGRESS'].includes(b.status),
  );

  const handleVideoConsultationPress = () => {
    if (activeVideoBookings.length > 0) {
      navigation.navigate('VideoConsultation', { bookingId: activeVideoBookings[0].id });
    } else {
      Alert.alert(
        'Video Consultation',
        'You have no active video sessions. Book a video consultation from the Services section.',
      );
    }
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

      {/* Video Consultation Quick Access */}
      <TouchableOpacity style={styles.videoCard} onPress={handleVideoConsultationPress}>
        <Text style={styles.videoCardIcon}>📹</Text>
        <View style={styles.videoCardContent}>
          <Text style={styles.videoCardTitle}>Video Consultation</Text>
          <Text style={styles.videoCardSub}>
            {activeVideoBookings.length > 0
              ? `${activeVideoBookings.length} active session${activeVideoBookings.length > 1 ? 's' : ''}`
              : 'Consult doctors from the comfort of home'}
          </Text>
        </View>
        <Text style={styles.videoCardArrow}>→</Text>
      </TouchableOpacity>

      {recentBookings && recentBookings.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Recent Bookings</Text>
          {recentBookings.slice(0, 3).map((booking: any) => {
            const isVideo = booking.mode === 'VIDEO_CONSULTATION';
            return (
              <TouchableOpacity
                key={booking.id}
                style={styles.bookingItem}
                onPress={() =>
                  isVideo
                    ? navigation.navigate('VideoConsultation', { bookingId: booking.id })
                    : navigation.navigate('Tracking', { bookingId: booking.id })
                }
              >
                <View>
                  <Text style={styles.bookingProvider}>
                    {isVideo ? '📹 ' : ''}{booking.provider?.name || 'Provider'}
                  </Text>
                  <Text style={styles.bookingService}>{booking.serviceCategory?.name}</Text>
                </View>
                <View>
                  <Text style={[styles.bookingStatus, { color: Colors.primary }]}>
                    {booking.status}
                  </Text>
                </View>
              </TouchableOpacity>
            );
          })}
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
  videoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    borderRadius: 12,
    padding: 14,
    marginHorizontal: 20,
    marginTop: 4,
    marginBottom: 8,
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    borderLeftWidth: 4,
    borderLeftColor: Colors.primary,
  },
  videoCardIcon: { fontSize: 28, marginRight: 14 },
  videoCardContent: { flex: 1 },
  videoCardTitle: { fontSize: 15, fontWeight: '700', color: Colors.text },
  videoCardSub: { fontSize: 12, color: Colors.textMuted, marginTop: 2 },
  videoCardArrow: { fontSize: 18, color: Colors.textMuted },
});
