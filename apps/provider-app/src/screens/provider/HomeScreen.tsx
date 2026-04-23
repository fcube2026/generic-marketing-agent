import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, RefreshControl } from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Colors } from '../../constants/colors';
import { Card } from '../../components/common/Card';
import { Toggle } from '../../components/common/Toggle';
import { BookingStatusBadge } from '../../components/booking/BookingStatusBadge';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { providerService } from '../../services/providerService';
import { bookingService } from '../../services/bookingService';
import { ProviderStackParamList } from '../../navigation/ProviderNavigator';
import { formatCurrency } from '../../utils/format';
import { getCurrentLocation } from '../../utils/location';
import { Booking, BookingStatus } from '../../types';

type Nav = NativeStackNavigationProp<ProviderStackParamList>;

export const HomeScreen: React.FC = () => {
  const navigation = useNavigation<Nav>();
  const queryClient = useQueryClient();

  const { data: profile, isLoading: profileLoading, refetch } = useQuery({
    queryKey: ['provider-profile'],
    queryFn: providerService.getProfile,
  });

  const { data: bookings, isRefetching } = useQuery<Booking[]>({
    queryKey: ['provider-bookings'],
    queryFn: bookingService.getProviderBookings,
    refetchInterval: 15000,
  });

  const availabilityMutation = useMutation({
    mutationFn: async (isAvailable: boolean) => {
      const location = isAvailable ? await getCurrentLocation() : null;
      return providerService.updateAvailability(
        isAvailable,
        location?.lat,
        location?.lng,
        profile?.serviceRadius,
      );
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['provider-profile'] }),
    onError: () => Alert.alert('Error', 'Failed to update availability'),
  });

  const pendingBookings = (bookings || []).filter((b) => b.status === 'REQUESTED');
  const activeVideoBookings = (bookings || []).filter(
    (b) =>
      b.mode === 'VIDEO_CONSULTATION' &&
      ['REQUESTED', 'ACCEPTED', 'IN_PROGRESS'].includes(b.status),
  );

  const handleVideoConsultationPress = () => {
    if (activeVideoBookings.length > 0) {
      navigation.navigate('VideoConsultation', { bookingId: activeVideoBookings[0].id });
    } else {
      navigation.navigate('InstantMeeting');
    }
  };
  const todayBookings = (bookings || []).filter(
    (b) => new Date(b.scheduledAt).toDateString() === new Date().toDateString()
  );
  const todayEarnings = todayBookings
    .filter((b) => b.status === 'COMPLETED' || b.status === 'CLOSED')
    .reduce((sum, b) => sum + b.totalFee * 0.8, 0);

  if (profileLoading) return <LoadingSpinner fullScreen />;

  if (!profile) {
    return (
      <View style={styles.onboardingPrompt}>
        <Text style={styles.onboardingIcon}>🏥</Text>
        <Text style={styles.onboardingTitle}>Complete Your Profile</Text>
        <Text style={styles.onboardingSub}>Set up your provider profile to start accepting bookings</Text>
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
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>Welcome back,</Text>
          <Text style={styles.name}>{profile.name}</Text>
          <Text style={styles.spec}>{profile.specialization}</Text>
        </View>
        {!profile.isVerified && (
          <View style={styles.unverifiedBadge}>
            <Text style={styles.unverifiedText}>⏳ Pending Verification</Text>
          </View>
        )}
      </View>

      <Card style={styles.availabilityCard}>
        <Text style={styles.availabilityTitle}>
          {profile.isAvailable ? '🟢 You are Available' : '🔴 You are Unavailable'}
        </Text>
        <Text style={styles.availabilitySub}>
          {profile.isAvailable ? 'You can receive new bookings' : 'Toggle to start accepting bookings'}
        </Text>
        <Toggle
          value={profile.isAvailable}
          onToggle={() => availabilityMutation.mutate(!profile.isAvailable)}
          size="lg"
        />
      </Card>

      <View style={styles.statsRow}>
        <Card style={styles.statCard} padding={14}>
          <Text style={styles.statValue}>{todayBookings.length}</Text>
          <Text style={styles.statLabel}>Today's Bookings</Text>
        </Card>
        <Card style={styles.statCard} padding={14}>
          <Text style={[styles.statValue, { color: Colors.primary }]}>{formatCurrency(todayEarnings)}</Text>
          <Text style={styles.statLabel}>Today's Earnings</Text>
        </Card>
        <Card style={styles.statCard} padding={14}>
          <Text style={[styles.statValue, { color: pendingBookings.length > 0 ? Colors.warning : Colors.textMuted }]}>{pendingBookings.length}</Text>
          <Text style={styles.statLabel}>Pending</Text>
        </Card>
      </View>

      {/* Video Consultation Quick Access */}
      <TouchableOpacity style={styles.videoCard} onPress={handleVideoConsultationPress}>
        <Text style={styles.videoCardIcon}>📹</Text>
        <View style={styles.videoCardContent}>
          <Text style={styles.videoCardTitle}>Video Consultations</Text>
          <Text style={styles.videoCardSub}>
            {activeVideoBookings.length > 0
              ? `${activeVideoBookings.length} active session${activeVideoBookings.length > 1 ? 's' : ''}`
              : 'Tap to start an instant meeting'}
          </Text>
        </View>
        <Text style={styles.videoCardArrow}>→</Text>
      </TouchableOpacity>

      {pendingBookings.length > 0 && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>🔔 New Requests</Text>
            <TouchableOpacity
              style={styles.viewAllBtn}
              onPress={() => navigation.navigate('IncomingBooking')}
            >
              <Text style={styles.viewAllText}>View All →</Text>
            </TouchableOpacity>
          </View>
          {pendingBookings.slice(0, 2).map((booking) => (
            <TouchableOpacity
              key={booking.id}
              style={styles.bookingAlert}
              onPress={() => navigation.navigate('BookingDetail', { bookingId: booking.id })}
            >
              <Text style={styles.bookingAlertText}>
                {booking.patient?.name || 'Patient'} — {booking.serviceCategory?.name}
              </Text>
              <Text style={styles.bookingAlertFee}>{formatCurrency(booking.totalFee)}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {todayBookings.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📅 Today's Schedule</Text>
          {todayBookings.map((booking) => (
            <TouchableOpacity
              key={booking.id}
              style={styles.bookingItem}
              onPress={() => navigation.navigate('BookingDetail', { bookingId: booking.id })}
            >
              <View style={styles.bookingItemLeft}>
                <Text style={styles.bookingPatient}>{booking.patient?.name || 'Patient'}</Text>
                <Text style={styles.bookingService}>{booking.serviceCategory?.name}</Text>
              </View>
              <BookingStatusBadge status={booking.status as BookingStatus} />
            </TouchableOpacity>
          ))}
        </View>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { backgroundColor: Colors.primary, padding: 20, paddingTop: 60, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  greeting: { fontSize: 14, color: 'rgba(255,255,255,0.8)' },
  name: { fontSize: 22, fontWeight: '800', color: Colors.white, marginTop: 2 },
  spec: { fontSize: 13, color: 'rgba(255,255,255,0.75)', marginTop: 2 },
  unverifiedBadge: { backgroundColor: Colors.warning, borderRadius: 12, paddingHorizontal: 10, paddingVertical: 6 },
  unverifiedText: { fontSize: 11, fontWeight: '700', color: Colors.white },
  availabilityCard: { margin: 16, marginBottom: 0 },
  availabilityTitle: { fontSize: 18, fontWeight: '700', color: Colors.text, marginBottom: 4 },
  availabilitySub: { fontSize: 13, color: Colors.textMuted, marginBottom: 16 },
  statsRow: { flexDirection: 'row', padding: 16, gap: 10 },
  statCard: { flex: 1 },
  statValue: { fontSize: 22, fontWeight: '800', color: Colors.text, marginBottom: 4 },
  statLabel: { fontSize: 11, color: Colors.textMuted },
  section: { padding: 16, paddingTop: 4 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: Colors.text },
  viewAllBtn: { paddingVertical: 4, paddingHorizontal: 8 },
  viewAllText: { fontSize: 12, color: Colors.primary, fontWeight: '600' },
  bookingAlert: { flexDirection: 'row', justifyContent: 'space-between', backgroundColor: '#FEF3C7', borderRadius: 10, padding: 14, marginBottom: 8, borderLeftWidth: 4, borderLeftColor: Colors.warning },
  bookingAlertText: { fontSize: 14, fontWeight: '600', color: Colors.text },
  bookingAlertFee: { fontSize: 15, fontWeight: '800', color: Colors.primary },
  bookingItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: Colors.white, borderRadius: 10, padding: 14, marginBottom: 8, elevation: 2 },
  bookingItemLeft: {},
  bookingPatient: { fontSize: 15, fontWeight: '600', color: Colors.text },
  bookingService: { fontSize: 13, color: Colors.textMuted },
  videoCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#EDE9FE', borderRadius: 12, margin: 16, marginTop: 16, marginBottom: 4, padding: 16, borderLeftWidth: 4, borderLeftColor: '#7C3AED' },
  videoCardIcon: { fontSize: 28, marginRight: 12 },
  videoCardContent: { flex: 1 },
  videoCardTitle: { fontSize: 15, fontWeight: '700', color: Colors.text },
  videoCardSub: { fontSize: 13, color: Colors.textMuted, marginTop: 2 },
  videoCardArrow: { fontSize: 18, color: '#7C3AED', fontWeight: '700' },
  onboardingPrompt: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, backgroundColor: Colors.background },
  onboardingIcon: { fontSize: 72, marginBottom: 20 },
  onboardingTitle: { fontSize: 24, fontWeight: '800', color: Colors.text, marginBottom: 8 },
  onboardingSub: { fontSize: 15, color: Colors.textMuted, textAlign: 'center', marginBottom: 28, lineHeight: 22 },
  onboardingBtn: { backgroundColor: Colors.primary, paddingHorizontal: 32, paddingVertical: 14, borderRadius: 12 },
  onboardingBtnText: { color: Colors.white, fontWeight: '700', fontSize: 16 },
});
