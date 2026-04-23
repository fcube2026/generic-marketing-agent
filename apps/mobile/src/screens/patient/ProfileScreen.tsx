import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Colors } from '../../constants/colors';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { VerificationBanner } from '../../components/verification/VerificationBanner';
import { useAuthStore } from '../../store/authStore';
import { patientService } from '../../services/patientService';
import { Address, PatientProfile } from '../../types';
import { PatientStackParamList } from '../../navigation/PatientNavigator';

type Nav = NativeStackNavigationProp<PatientStackParamList>;

export const ProfileScreen: React.FC = () => {
  const navigation = useNavigation<Nav>();
  const { user, logout } = useAuthStore();

  const { data: profile, isLoading } = useQuery<PatientProfile | null>({
    queryKey: ['patient-profile'],
    queryFn: patientService.getProfile,
  });

  const { data: addresses = [] } = useQuery<Address[]>({
    queryKey: ['patient-addresses'],
    queryFn: patientService.getAddresses,
  });

  if (isLoading) return <LoadingSpinner fullScreen />;

  const isProfileComplete = Boolean(profile);

  if (!isProfileComplete) {
    return (
      <View style={styles.emptyStateContainer}>
        <Text style={styles.emptyStateIcon}>🧾</Text>
        <Text style={styles.emptyStateTitle}>Complete Your Profile</Text>
        <Text style={styles.emptyStateText}>
          Add your personal details to finish setting up your patient account.
        </Text>
        <TouchableOpacity style={styles.completeBtn} onPress={() => navigation.navigate('Onboarding')}>
          <Text style={styles.completeBtnText}>Complete Now →</Text>
        </TouchableOpacity>
        <View style={styles.footer}>
          <Button title="Sign Out" onPress={logout} variant="outline" />
        </View>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <VerificationBanner />
      <View style={styles.header}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            {(profile?.name || user?.phone || 'U').charAt(0).toUpperCase()}
          </Text>
        </View>
        <Text style={styles.name}>{profile?.name || 'Complete your profile'}</Text>
        <Text style={styles.phone}>{user?.phone}</Text>
      </View>

      <Card style={styles.card}>
        <Text style={styles.sectionTitle}>Personal Details</Text>
        {profile ? (
          <>
            {profile.dateOfBirth && (
              <View style={styles.row}>
                <Text style={styles.label}>Date of Birth</Text>
                <Text style={styles.value}>{profile.dateOfBirth}</Text>
              </View>
            )}
            {profile.gender && (
              <View style={styles.row}>
                <Text style={styles.label}>Gender</Text>
                <Text style={styles.value}>{profile.gender}</Text>
              </View>
            )}
            {profile.emergencyContact && (
              <View style={styles.row}>
                <Text style={styles.label}>Emergency Contact</Text>
                <Text style={styles.value}>{profile.emergencyContact}</Text>
              </View>
            )}
          </>
        ) : (
          <Text style={styles.emptyText}>No profile information available</Text>
        )}
      </Card>

      {addresses && addresses.length > 0 && (
        <Card style={styles.card}>
          <Text style={styles.sectionTitle}>Saved Addresses</Text>
          {addresses.map((addr) => (
            <View key={addr.id} style={styles.addressItem}>
              <Text style={styles.addressLabel}>{addr.label}</Text>
              <Text style={styles.addressText}>{addr.addressLine}, {addr.city}</Text>
              {addr.isDefault && <Text style={styles.defaultBadge}>Default</Text>}
            </View>
          ))}
        </Card>
      )}

      <View style={styles.footer}>
        <Button title="Edit Profile" onPress={() => navigation.navigate('Onboarding')} />
        <Button title="Identity Verification (KYC)" onPress={() => navigation.navigate('PatientKyc')} variant="outline" />
        <Button title="Sign Out" onPress={logout} variant="outline" />
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  emptyStateContainer: {
    flex: 1,
    backgroundColor: Colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 28,
  },
  emptyStateIcon: { fontSize: 64, marginBottom: 16 },
  emptyStateTitle: { fontSize: 24, fontWeight: '800', color: Colors.text, marginBottom: 8 },
  emptyStateText: {
    fontSize: 15,
    color: Colors.textMuted,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
  },
  completeBtn: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 28,
    paddingVertical: 14,
    borderRadius: 12,
    marginBottom: 20,
  },
  completeBtnText: { color: Colors.white, fontSize: 16, fontWeight: '700' },
  header: {
    backgroundColor: Colors.primary,
    alignItems: 'center',
    paddingTop: 60,
    paddingBottom: 30,
    paddingHorizontal: 20,
  },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: 'rgba(255,255,255,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  avatarText: { fontSize: 30, fontWeight: '700', color: Colors.white },
  name: { fontSize: 22, fontWeight: '700', color: Colors.white, marginBottom: 4 },
  phone: { fontSize: 15, color: 'rgba(255,255,255,0.8)' },
  card: { margin: 16, marginBottom: 0 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: Colors.text, marginBottom: 12 },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  label: { fontSize: 14, color: Colors.textMuted },
  value: { fontSize: 14, fontWeight: '600', color: Colors.text },
  emptyText: { fontSize: 14, color: Colors.textMuted, fontStyle: 'italic' },
  addressItem: { paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: Colors.border },
  addressLabel: { fontSize: 14, fontWeight: '600', color: Colors.text },
  addressText: { fontSize: 13, color: Colors.textMuted, marginTop: 2 },
  defaultBadge: {
    marginTop: 4,
    fontSize: 11,
    color: Colors.primary,
    fontWeight: '600',
    backgroundColor: Colors.primaryLight,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    alignSelf: 'flex-start',
  },
  footer: { padding: 16, paddingTop: 20, gap: 12 },
});
