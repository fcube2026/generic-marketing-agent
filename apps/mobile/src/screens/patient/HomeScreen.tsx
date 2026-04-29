import React, { useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Alert,
} from 'react-native';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useFocusEffect } from '@react-navigation/native';
import { Colors } from '../../constants/colors';
import { ServiceCategoryCard } from '../../components/home/ServiceCategoryCard';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { VerificationBanner } from '../../components/verification/VerificationBanner';
import { useAuthStore } from '../../store/authStore';
import api from '../../services/api';
import { ServiceCategory } from '../../types';
import { Booking, PharmacyOrder } from '../../types';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { PatientStackParamList } from '../../navigation/PatientNavigator';
import { useNavigation } from '@react-navigation/native';
import { patientService } from '../../services/patientService';
import { notificationService, Notification } from '../../services/notificationService';
import { PatientProfile } from '../../types';
import { pharmacyService } from '../../services/pharmacyService';

// Show refill banner if a delivered order is older than this many days
const REFILL_THRESHOLD_DAYS = 25;

type Nav = NativeStackNavigationProp<PatientStackParamList>;

const DAYS_MS = 24 * 60 * 60 * 1000;

const shouldShowRefillBanner = (orders: PharmacyOrder[] | undefined): boolean => {
  if (!orders || orders.length === 0) return false;
  const now = Date.now();
  return orders.some(
    (o) =>
      o.status === 'DELIVERED' &&
      now - new Date(o.createdAt).getTime() > REFILL_THRESHOLD_DAYS * DAYS_MS,
  );
};

export const HomeScreen: React.FC = () => {
  const navigation = useNavigation<Nav>();
  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  const { data: profile, isLoading: profileLoading } = useQuery<PatientProfile | null>({
    queryKey: ['patient-profile'],
    queryFn: patientService.getProfile,
  });

  const isProfileComplete = Boolean(profile);
  const canUsePatientApp = isProfileComplete;

  const {
    data: services,
    isLoading,
    refetch,
    isRefetching,
  } = useQuery<ServiceCategory[]>({
    queryKey: ['services'],
    enabled: canUsePatientApp,
    queryFn: async () => {
      const res = await api.get('/services');
      return res.data;
    },
  });

  const { data: recentBookings } = useQuery<Booking[]>({
    queryKey: ['patient-bookings'],
    enabled: isProfileComplete,
    queryFn: async () => {
      const res = await api.get('/patients/me/bookings');
      return res.data;
    },
    refetchInterval: 15000,
    refetchOnWindowFocus: 'always',
    staleTime: 0,
  });

  const { data: notifications } = useQuery<Notification[]>({
    queryKey: ['notifications'],
    enabled: isProfileComplete,
    queryFn: notificationService.getNotifications,
    refetchInterval: 5000, // Poll every 5 seconds for reminders
  });

  const latestReminder = (notifications || []).find(
    n => !n.isRead && n.type === 'VIDEO_CONSULTATION_REMINDER'
  );

  const { data: pharmacyOrders } = useQuery<PharmacyOrder[]>({
    queryKey: ['pharmacy-orders'],
    enabled: isProfileComplete,
    queryFn: () => pharmacyService.getOrders(1, 20),
    select: (data) => data,
  });

  const showRefillBanner = useMemo(
    () => shouldShowRefillBanner(pharmacyOrders),
    [pharmacyOrders],
  );

  useFocusEffect(
    useCallback(() => {
      queryClient.invalidateQueries({ queryKey: ['patient-bookings'] });
    }, [queryClient]),
  );

  const handleServicePress = (category: ServiceCategory) => {
    navigation.navigate('SelectService', { category });
  };

  const activeVideoBookings = (recentBookings || []).filter(
    (b: Booking) =>
      b.mode === 'VIDEO_CONSULTATION' &&
      ['REQUESTED', 'ACCEPTED', 'IN_PROGRESS'].includes(b.status),
  );

  const handleVideoConsultationPress = () => {
    if (activeVideoBookings.length > 0) {
      navigation.navigate('VideoLobby', { bookingId: activeVideoBookings[0].id });
    }
  };

  if (profileLoading || (canUsePatientApp && isLoading)) {
    return <LoadingSpinner fullScreen />;
  }

  if (!canUsePatientApp) {
    return (
      <View style={styles.onboardingPrompt}>
        <Text style={styles.onboardingIcon}>🩺</Text>
        <Text style={styles.onboardingTitle}>Complete Your Profile</Text>
        <Text style={styles.onboardingSub}>
          Add your personal details before booking services.
        </Text>
        <TouchableOpacity style={styles.onboardingBtn} onPress={() => navigation.navigate('Onboarding')}>
          <Text style={styles.onboardingBtnText}>Get Started →</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} />}
    >
      <VerificationBanner />

      {latestReminder && (
        <TouchableOpacity 
          style={styles.reminderBanner}
          onPress={() => {
            notificationService.markAsRead(latestReminder.id);
            queryClient.invalidateQueries({ queryKey: ['notifications'] });
            if (latestReminder.metadata?.bookingId) {
              navigation.navigate('VideoLobby', { bookingId: latestReminder.metadata.bookingId });
            }
          }}
        >
          <View style={styles.reminderContent}>
            <Text style={styles.reminderTitle}>{latestReminder.title}</Text>
            <Text style={styles.reminderMessage}>{latestReminder.message}</Text>
          </View>
          <Text style={styles.reminderAction}>JOIN ➔</Text>
        </TouchableOpacity>
      )}

      {showRefillBanner && (
        <View style={styles.refillBanner}>
          <Text style={styles.refillBannerIcon}>💊</Text>
          <View style={styles.refillBannerContent}>
            <Text style={styles.refillBannerTitle}>Time to refill your medicines</Text>
            <Text style={styles.refillBannerSub}>
              Your previous order may be running low
            </Text>
          </View>
          <TouchableOpacity
            style={styles.refillBannerButton}
            onPress={() => navigation.navigate('PharmacyOrders')}
          >
            <Text style={styles.refillBannerButtonText}>Reorder Now</Text>
          </TouchableOpacity>
        </View>
      )}

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

      {activeVideoBookings.length > 0 && (
        <TouchableOpacity style={styles.videoCard} onPress={handleVideoConsultationPress}>
          <Text style={styles.videoCardIcon}>📹</Text>
          <View style={styles.videoCardContent}>
            <Text style={styles.videoCardTitle}>Resume Video Consultation</Text>
            <Text style={styles.videoCardSub}>
              {`${activeVideoBookings.length} active session${activeVideoBookings.length > 1 ? 's' : ''}`}
            </Text>
          </View>
          <Text style={styles.videoCardArrow}>→</Text>
        </TouchableOpacity>
      )}

      {/* Prescription Order Quick Access */}
      <TouchableOpacity
        style={styles.videoCard}
        onPress={() => navigation.navigate('PrescriptionOrder')}
      >
        <Text style={styles.videoCardIcon}>💊</Text>
        <View style={styles.videoCardContent}>
          <Text style={styles.videoCardTitle}>Prescription Order</Text>
          <Text style={styles.videoCardSub}>Upload prescription & order medicines</Text>
        </View>
        <Text style={styles.videoCardArrow}>→</Text>
      </TouchableOpacity>

      {/* OTC Medicine Order Quick Access */}
      <TouchableOpacity
        style={styles.videoCard}
        onPress={() => navigation.navigate('MedicineSearch')}
      >
        <Text style={styles.videoCardIcon}>🛒</Text>
        <View style={styles.videoCardContent}>
          <Text style={styles.videoCardTitle}>Order Without Prescription</Text>
          <Text style={styles.videoCardSub}>Search & order OTC medicines directly</Text>
        </View>
        <Text style={styles.videoCardArrow}>→</Text>
      </TouchableOpacity>

      {/* Pharmacy My Orders Quick Access */}
      <TouchableOpacity
        style={styles.videoCard}
        onPress={() => navigation.navigate('PharmacyOrders')}
      >
        <Text style={styles.videoCardIcon}>📦</Text>
        <View style={styles.videoCardContent}>
          <Text style={styles.videoCardTitle}>My Orders</Text>
          <Text style={styles.videoCardSub}>Track and revisit your medicine orders</Text>
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
                    ? navigation.navigate('VideoLobby', { bookingId: booking.id })
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
  onboardingPrompt: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    backgroundColor: Colors.background,
  },
  onboardingIcon: { fontSize: 72, marginBottom: 20 },
  onboardingTitle: { fontSize: 24, fontWeight: '800', color: Colors.text, marginBottom: 8 },
  onboardingSub: {
    fontSize: 15,
    color: Colors.textMuted,
    textAlign: 'center',
    marginBottom: 28,
    lineHeight: 22,
  },
  onboardingBtn: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 12,
  },
  onboardingBtnText: { color: Colors.white, fontWeight: '700', fontSize: 16 },
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
  reminderBanner: {
    backgroundColor: '#F59E0B',
    margin: 16,
    marginBottom: 0,
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    elevation: 6,
    shadowColor: '#F59E0B',
    shadowOpacity: 0.4,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
  },
  reminderContent: {
    flex: 1,
  },
  reminderTitle: {
    color: Colors.white,
    fontSize: 14,
    fontWeight: '800',
    marginBottom: 2,
    textTransform: 'uppercase',
  },
  reminderMessage: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 13,
    fontWeight: '600',
  },
  reminderAction: {
    color: Colors.white,
    fontWeight: '900',
    fontSize: 14,
    marginLeft: 12,
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    overflow: 'hidden',
  },
  refillBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primaryLight,
    borderLeftWidth: 4,
    borderLeftColor: Colors.primary,
    borderRadius: 12,
    padding: 14,
    marginHorizontal: 20,
    marginTop: 12,
    marginBottom: 4,
  },
  refillBannerIcon: { fontSize: 24, marginRight: 10 },
  refillBannerContent: { flex: 1 },
  refillBannerTitle: { fontSize: 14, fontWeight: '700', color: Colors.primaryDark },
  refillBannerSub: { fontSize: 12, color: Colors.textMuted, marginTop: 2 },
  refillBannerButton: {
    backgroundColor: Colors.primary,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginLeft: 10,
  },
  refillBannerButtonText: { fontSize: 12, fontWeight: '700', color: Colors.white },
});
