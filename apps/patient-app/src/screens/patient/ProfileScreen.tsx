import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Colors } from '../../constants/colors';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { useAuthStore } from '../../store/authStore';
import { PatientStackParamList } from '../../navigation/PatientNavigator';
import api from '../../services/api';

export const ProfileScreen: React.FC = () => {
  const { user, logout } = useAuthStore();
  const navigation =
    useNavigation<NativeStackNavigationProp<PatientStackParamList>>();

  const { data: profile, isLoading } = useQuery({
    queryKey: ['patient-profile'],
    queryFn: async () => {
      const res = await api.get('/patients/me');
      return res.data;
    },
  });

  const { data: addresses } = useQuery({
    queryKey: ['patient-addresses'],
    queryFn: async () => {
      const res = await api.get('/patients/me/addresses');
      return res.data;
    },
  });

  if (isLoading) return <LoadingSpinner fullScreen />;

  return (
    <ScrollView style={styles.container}>
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
        <Button
          title="Edit Profile"
          onPress={() => navigation.navigate('ProfileSetup')}
          variant="outline"
          style={styles.editButton}
        />
      </Card>

      {addresses && addresses.length > 0 && (
        <Card style={styles.card}>
          <Text style={styles.sectionTitle}>Saved Addresses</Text>
          {addresses.map((addr: any) => (
            <View key={addr.id} style={styles.addressItem}>
              <Text style={styles.addressLabel}>{addr.label}</Text>
              <Text style={styles.addressText}>{addr.addressLine}, {addr.city}</Text>
              {addr.isDefault && <Text style={styles.defaultBadge}>Default</Text>}
            </View>
          ))}
          <Button
            title="Manage Addresses"
            onPress={() => navigation.navigate('AddressList')}
            variant="outline"
            style={styles.editButton}
          />
        </Card>
      )}

      {(!addresses || addresses.length === 0) && (
        <Card style={styles.card}>
          <Text style={styles.sectionTitle}>Saved Addresses</Text>
          <Text style={styles.emptyText}>No addresses saved yet</Text>
          <Button
            title="Add Address"
            onPress={() => navigation.navigate('AddressList')}
            variant="outline"
            style={styles.editButton}
          />
        </Card>
      )}

      <View style={styles.footer}>
        <Button title="Sign Out" onPress={logout} variant="outline" />
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
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
  editButton: { marginTop: 12 },
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
  footer: { padding: 16, paddingTop: 20 },
});
