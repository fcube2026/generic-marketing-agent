import React, { useEffect, useState } from 'react';
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Colors } from '../../constants/colors';
import { Button } from '../../components/common/Button';
import { Input } from '../../components/common/Input';
import { patientService } from '../../services/patientService';
import { PatientProfile } from '../../types';

const GENDER_OPTIONS: Array<'MALE' | 'FEMALE' | 'OTHER'> = [
  'MALE',
  'FEMALE',
  'OTHER',
];

const normalizeDateOfBirth = (value: string) => {
  const trimmed = value.trim();
  if (!trimmed) {
    return trimmed;
  }

  return new Date(`${trimmed}T00:00:00.000Z`).toISOString();
};

export const OnboardingScreen: React.FC = () => {
  const navigation = useNavigation();
  const queryClient = useQueryClient();
  const [loading, setLoading] = useState(false);
  const [profileForm, setProfileForm] = useState({
    name: '',
    dateOfBirth: '',
    gender: 'MALE' as 'MALE' | 'FEMALE' | 'OTHER',
    emergencyContact: '',
  });

  const { data: existingProfile, isLoading: profileLoading } = useQuery<PatientProfile | null>({
    queryKey: ['patient-profile'],
    queryFn: patientService.getProfile,
  });

  useEffect(() => {
    if (!existingProfile) {
      return;
    }

    setProfileForm({
      name: existingProfile.name || '',
      dateOfBirth: existingProfile.dateOfBirth || '',
      gender: (existingProfile.gender as 'MALE' | 'FEMALE' | 'OTHER') || 'MALE',
      emergencyContact: existingProfile.emergencyContact || '',
    });
  }, [existingProfile]);

  const updateProfileForm = (key: keyof typeof profileForm, value: string) => {
    setProfileForm((current) => ({ ...current, [key]: value }));
  };

  const validateForm = () => {
    if (!profileForm.name.trim() || !profileForm.dateOfBirth.trim() || !profileForm.gender) {
      Alert.alert('Required', 'Name, date of birth, and gender are required.');
      return false;
    }

    return true;
  };

  const handleSubmit = async () => {
    if (!validateForm()) {
      return;
    }

    setLoading(true);
    try {
      const profilePayload = {
        name: profileForm.name.trim(),
        dateOfBirth: normalizeDateOfBirth(profileForm.dateOfBirth),
        gender: profileForm.gender,
        emergencyContact: profileForm.emergencyContact.trim() || undefined,
      };

      if (existingProfile) {
        await patientService.updateProfile(profilePayload);
      } else {
        await patientService.createProfile(profilePayload);
      }

      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['patient-profile'] }),
        queryClient.invalidateQueries({ queryKey: ['patient-bookings'] }),
      ]);

      Alert.alert('Success', 'Your patient profile is ready.', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch (error: any) {
      const message = Array.isArray(error?.response?.data?.message)
        ? error.response.data.message.join('\n')
        : error?.response?.data?.message || error?.response?.data?.error || 'Failed to save profile';
      Alert.alert('Error', message);
    } finally {
      setLoading(false);
    }
  };

  if (profileLoading) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Loading your profile...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.stepContent}>
        <Text style={styles.stepTitle}>Complete Your Profile</Text>
        <Input
          label="Full Name *"
          value={profileForm.name}
          onChangeText={(value) => updateProfileForm('name', value)}
          placeholder="Enter your full name"
        />
        <Input
          label="Date of Birth *"
          value={profileForm.dateOfBirth}
          onChangeText={(value) => updateProfileForm('dateOfBirth', value)}
          placeholder="YYYY-MM-DD"
        />
        <Text style={styles.fieldLabel}>Gender *</Text>
        <View style={styles.genderRow}>
          {GENDER_OPTIONS.map((option) => {
            const selected = profileForm.gender === option;
            return (
              <TouchableOpacity
                key={option}
                style={[styles.genderChip, selected && styles.genderChipActive]}
                onPress={() => updateProfileForm('gender', option)}
              >
                <Text style={[styles.genderChipText, selected && styles.genderChipTextActive]}>
                  {option}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
        <Input
          label="Emergency Contact"
          value={profileForm.emergencyContact}
          onChangeText={(value) => updateProfileForm('emergencyContact', value)}
          keyboardType="phone-pad"
          placeholder="Alternate phone number"
        />
        <Button title="Save Profile" onPress={handleSubmit} loading={loading} />
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  loadingContainer: {
    flex: 1,
    backgroundColor: Colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  loadingText: { fontSize: 16, color: Colors.textMuted },
  stepContent: { padding: 20 },
  stepTitle: { fontSize: 22, fontWeight: '800', color: Colors.text, marginBottom: 20 },
  fieldLabel: { fontSize: 14, fontWeight: '500', color: Colors.text, marginBottom: 10 },
  genderRow: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  genderChip: {
    flex: 1,
    borderWidth: 1.5,
    borderColor: Colors.border,
    backgroundColor: Colors.white,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
  },
  genderChipActive: { borderColor: Colors.primary, backgroundColor: Colors.primaryLight },
  genderChipText: { fontSize: 14, fontWeight: '600', color: Colors.textMuted },
  genderChipTextActive: { color: Colors.primaryDark },
});