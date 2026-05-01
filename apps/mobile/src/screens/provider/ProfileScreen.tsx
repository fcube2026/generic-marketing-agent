import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Colors } from '../../constants/colors';
import { Card } from '../../components/common/Card';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { providerService } from '../../services/providerService';
import { bookingService } from '../../services/bookingService';
import { useAuthStore } from '../../store/authStore';
import { formatCurrency } from '../../utils/format';
import { ProviderStackParamList } from '../../navigation/ProviderNavigator';
import { Booking } from '../../types';

type Nav = NativeStackNavigationProp<ProviderStackParamList>;

export const ProfileScreen: React.FC = () => {
  const navigation = useNavigation<Nav>();
  const { user, logout } = useAuthStore();

  const { data: profile, isLoading: profileLoading } = useQuery({
    queryKey: ['provider-profile'],
    queryFn: providerService.getProfile,
  });

  const { data: bookings = [] } = useQuery<Booking[]>({
    queryKey: ['provider-bookings-profile'],
    queryFn: bookingService.getProviderBookings,
  });

  // "Consultations" badge counts only COMPLETED (problem requirement: in-progress
  // bookings must NOT appear here). Earnings includes all closed financial states.
  const completedCount = bookings.filter((b) => b.status === 'COMPLETED').length;

  const totalEarned = bookings
    .filter((b) => ['COMPLETED', 'SUMMARY_SUBMITTED', 'CLOSED'].includes(b.status))
    .reduce((sum, b) => sum + b.totalFee * 0.8, 0);

  const handleLogout = () => {
    Alert.alert('Logout', 'Are you sure you want to logout?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Logout',
        style: 'destructive',
        onPress: async () => {
          await logout();
        },
      },
    ]);
  };

  if (profileLoading) return <LoadingSpinner fullScreen />;

  const initials = profile?.name
    ? profile.name
        .split(' ')
        .map((n: string) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)
    : '?';

  return (
    <ScrollView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.avatarContainer}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{initials}</Text>
          </View>
          {profile?.isVerified && (
            <View style={styles.verifiedBadge}>
              <Text style={styles.verifiedText}>✓</Text>
            </View>
          )}
        </View>
        <Text style={styles.name}>{profile?.name || 'Provider'}</Text>
        <Text style={styles.specialization}>{profile?.specialization || 'Healthcare Provider'}</Text>
        <Text style={styles.phone}>{user?.phone || '—'}</Text>
      </View>

      {/* Stats */}
      <View style={styles.statsRow}>
        <Card style={styles.statCard} padding={14}>
          <Text style={styles.statValue}>{completedCount}</Text>
          <Text style={styles.statLabel}>Consultations</Text>
        </Card>
        <Card style={styles.statCard} padding={14}>
          <Text style={[styles.statValue, { color: Colors.primary }]}>4.8</Text>
          <Text style={styles.statLabel}>Rating</Text>
        </Card>
        <Card style={styles.statCard} padding={14}>
          <Text style={[styles.statValue, { color: Colors.success }]}>
            {formatCurrency(totalEarned)}
          </Text>
          <Text style={styles.statLabel}>Total Earned</Text>
        </Card>
      </View>

      {/* Service Modes */}
      {profile && (
        <Card style={styles.sectionCard} padding={16}>
          <Text style={styles.sectionTitle}>Service Modes</Text>
          <View style={styles.serviceModesRow}>
            {profile.homeVisitEnabled && (
              <View style={[styles.modeBadge, { backgroundColor: Colors.primaryLight }]}>
                <Text style={styles.modeBadgeText}>🏠 Home Visit — {formatCurrency(profile.consultationFeeHomeVisit)}</Text>
              </View>
            )}
            {profile.doctorPlaceVisitEnabled && (
              <View style={[styles.modeBadge, { backgroundColor: '#DBEAFE' }]}>
                <Text style={styles.modeBadgeText}>🏥 Clinic — {formatCurrency(profile.consultationFeeDoctorPlace)}</Text>
              </View>
            )}
            {profile.videoConsultationEnabled !== false && (
              <View style={[styles.modeBadge, { backgroundColor: '#EFF6FF' }]}>
                <Text style={styles.modeBadgeText}>📹 Video — {formatCurrency(profile.consultationFeeVideoConsultation || 500)}</Text>
              </View>
            )}
          </View>
          <Text style={styles.radiusText}>
            📍 Service Radius: {profile.serviceRadius} km
          </Text>
        </Card>
      )}

      {/* Quick Actions */}
      <View style={styles.actionsSection}>
        <Text style={styles.actionsSectionTitle}>Quick Actions</Text>

        <TouchableOpacity
          style={styles.actionItem}
          onPress={() => navigation.navigate('Availability')}
        >
          <Text style={styles.actionIcon}>⚙️</Text>
          <View style={styles.actionContent}>
            <Text style={styles.actionLabel}>Availability Settings</Text>
            <Text style={styles.actionDescription}>Working hours, fees, service radius</Text>
          </View>
          <Text style={styles.actionArrow}>→</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.actionItem}
          onPress={() => navigation.navigate('Onboarding')}
        >
          <Text style={styles.actionIcon}>✏️</Text>
          <View style={styles.actionContent}>
            <Text style={styles.actionLabel}>Edit Profile</Text>
            <Text style={styles.actionDescription}>Name, specialization, bio</Text>
          </View>
          <Text style={styles.actionArrow}>→</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionItem} onPress={() => navigation.navigate('Kyc')}>
          <Text style={styles.actionIcon}>📄</Text>
          <View style={styles.actionContent}>
            <Text style={styles.actionLabel}>KYC & Documents</Text>
            <Text style={styles.actionDescription}>
              {profile?.isVerified ? '✅ Verified' : '⏳ Pending Verification'}
            </Text>
          </View>
          <Text style={styles.actionArrow}>→</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionItem} onPress={() => Alert.alert('Coming Soon', 'Support will be available soon.')}>
          <Text style={styles.actionIcon}>💬</Text>
          <View style={styles.actionContent}>
            <Text style={styles.actionLabel}>Help & Support</Text>
            <Text style={styles.actionDescription}>Contact our team</Text>
          </View>
          <Text style={styles.actionArrow}>→</Text>
        </TouchableOpacity>
      </View>

      {/* App Info */}
      <Card style={styles.infoCard} padding={14}>
        <Text style={styles.infoTitle}>Curex24 Provider</Text>
        <Text style={styles.infoVersion}>Version 1.0.0 (MVP)</Text>
      </Card>

      {/* Logout */}
      <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
        <Text style={styles.logoutBtnText}>🚪 Logout</Text>
      </TouchableOpacity>

      <View style={{ height: 40 }} />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: {
    backgroundColor: Colors.primary,
    alignItems: 'center',
    padding: 24,
    paddingTop: 60,
    paddingBottom: 28,
  },
  avatarContainer: { position: 'relative', marginBottom: 12 },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255,255,255,0.25)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: 'rgba(255,255,255,0.4)',
  },
  avatarText: { fontSize: 28, fontWeight: '800', color: Colors.white },
  verifiedBadge: {
    position: 'absolute',
    bottom: 0,
    right: -4,
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: Colors.success,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: Colors.primary,
  },
  verifiedText: { fontSize: 14, fontWeight: '800', color: Colors.white },
  name: { fontSize: 22, fontWeight: '800', color: Colors.white },
  specialization: { fontSize: 14, color: 'rgba(255,255,255,0.8)', marginTop: 2 },
  phone: { fontSize: 13, color: 'rgba(255,255,255,0.65)', marginTop: 4 },
  statsRow: {
    flexDirection: 'row',
    padding: 16,
    gap: 10,
    marginTop: -16,
  },
  statCard: { flex: 1, alignItems: 'center' },
  statValue: { fontSize: 20, fontWeight: '800', color: Colors.text },
  statLabel: { fontSize: 11, color: Colors.textMuted, marginTop: 4 },
  sectionCard: {
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 14,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 12,
  },
  serviceModesRow: { gap: 8 },
  modeBadge: {
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 4,
  },
  modeBadgeText: { fontSize: 13, fontWeight: '600', color: Colors.text },
  radiusText: { fontSize: 13, color: Colors.textMuted, marginTop: 10 },
  actionsSection: { paddingHorizontal: 16, marginBottom: 16 },
  actionsSectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 12,
  },
  actionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
    elevation: 1,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 },
  },
  actionIcon: { fontSize: 22, marginRight: 14 },
  actionContent: { flex: 1 },
  actionLabel: { fontSize: 15, fontWeight: '600', color: Colors.text },
  actionDescription: { fontSize: 12, color: Colors.textMuted, marginTop: 2 },
  actionArrow: { fontSize: 18, color: Colors.textMuted },
  infoCard: {
    marginHorizontal: 16,
    marginBottom: 12,
    alignItems: 'center',
    borderRadius: 14,
  },
  infoTitle: { fontSize: 14, fontWeight: '700', color: Colors.primary },
  infoVersion: { fontSize: 12, color: Colors.textMuted, marginTop: 2 },
  logoutBtn: {
    marginHorizontal: 16,
    backgroundColor: Colors.white,
    borderWidth: 1.5,
    borderColor: Colors.error,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  logoutBtnText: { fontSize: 16, fontWeight: '700', color: Colors.error },
});
