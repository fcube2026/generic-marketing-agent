import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Colors } from '../../constants/colors';
import { Button } from '../../components/common/Button';
import { Input } from '../../components/common/Input';
import { patientService } from '../../services/patientService';
import { useAuthStore } from '../../store/authStore';

type Gender = 'MALE' | 'FEMALE' | 'OTHER';

const GENDER_OPTIONS: { label: string; value: Gender }[] = [
  { label: 'Male', value: 'MALE' },
  { label: 'Female', value: 'FEMALE' },
  { label: 'Other', value: 'OTHER' },
];

/** Validates a date string in YYYY-MM-DD format and checks a sensible age range */
const isValidDateOfBirth = (dob: string): boolean => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dob)) return false;
  const [yearStr, monthStr, dayStr] = dob.split('-');
  const year = parseInt(yearStr, 10);
  const month = parseInt(monthStr, 10);
  const day = parseInt(dayStr, 10);
  // Use component constructor to avoid timezone shifts from ISO string parsing
  const date = new Date(year, month - 1, day);
  // Verify no calendar overflow (e.g. Feb 30 → Mar 2)
  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return false;
  }
  const now = new Date();
  const minYear = now.getFullYear() - 120;
  return year >= minYear && date <= now;
};

export const ProfileSetupScreen: React.FC = () => {
  const { setHasProfile } = useAuthStore();

  const [name, setName] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [gender, setGender] = useState<Gender | ''>('');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<{
    name?: string;
    dateOfBirth?: string;
    gender?: string;
  }>({});

  const validate = (): boolean => {
    const newErrors: typeof errors = {};

    if (!name.trim()) {
      newErrors.name = 'Name is required';
    } else if (name.trim().length < 2) {
      newErrors.name = 'Name must be at least 2 characters';
    }

    if (!dateOfBirth) {
      newErrors.dateOfBirth = 'Date of birth is required';
    } else if (!isValidDateOfBirth(dateOfBirth)) {
      newErrors.dateOfBirth = 'Enter a valid date in YYYY-MM-DD format';
    }

    if (!gender) {
      newErrors.gender = 'Please select a gender';
    } else if (!['MALE', 'FEMALE', 'OTHER'].includes(gender)) {
      newErrors.gender = 'Select a valid gender';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    setLoading(true);
    try {
      await patientService.createOrUpdateProfile({
        name: name.trim(),
        dateOfBirth,
        gender,
      });
      setHasProfile(true);
    } catch (err: any) {
      Alert.alert(
        'Error',
        err?.response?.data?.message ||
          'Failed to save profile. Please try again.',
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.header}>
          <Text style={styles.title}>Complete Your Profile</Text>
          <Text style={styles.subtitle}>
            Tell us a bit about yourself to get started
          </Text>
        </View>

        <View style={styles.form}>
          <Input
            label="Full Name *"
            placeholder="Enter your full name"
            value={name}
            onChangeText={(text) => {
              setName(text);
              if (errors.name) setErrors((e) => ({ ...e, name: undefined }));
            }}
            autoCapitalize="words"
            autoComplete="name"
            error={errors.name}
          />

          <Input
            label="Date of Birth *"
            placeholder="YYYY-MM-DD"
            value={dateOfBirth}
            onChangeText={(text) => {
              setDateOfBirth(text);
              if (errors.dateOfBirth)
                setErrors((e) => ({ ...e, dateOfBirth: undefined }));
            }}
            keyboardType="numeric"
            maxLength={10}
            error={errors.dateOfBirth}
          />

          <View style={styles.genderSection}>
            <Text style={styles.genderLabel}>Gender *</Text>
            <View style={styles.genderRow}>
              {GENDER_OPTIONS.map((option) => {
                const selected = gender === option.value;
                return (
                  <TouchableOpacity
                    key={option.value}
                    style={[
                      styles.genderOption,
                      selected && styles.genderOptionSelected,
                    ]}
                    onPress={() => {
                      setGender(option.value);
                      if (errors.gender)
                        setErrors((e) => ({ ...e, gender: undefined }));
                    }}
                    activeOpacity={0.7}
                  >
                    <Text
                      style={[
                        styles.genderText,
                        selected && styles.genderTextSelected,
                      ]}
                    >
                      {option.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
            {errors.gender && (
              <Text style={styles.errorText}>{errors.gender}</Text>
            )}
          </View>

          <Button
            title="Save Profile"
            onPress={handleSubmit}
            loading={loading}
            disabled={!name.trim() || !dateOfBirth || !gender}
            style={styles.submitButton}
          />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: Colors.background },
  container: {
    flexGrow: 1,
    padding: 24,
    paddingTop: 60,
  },
  header: { marginBottom: 32 },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: Colors.text,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 15,
    color: Colors.textMuted,
    lineHeight: 22,
  },
  form: { flex: 1 },
  genderSection: { marginBottom: 16 },
  genderLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.text,
    marginBottom: 10,
  },
  genderRow: {
    flexDirection: 'row',
    gap: 10,
  },
  genderOption: {
    flex: 1,
    paddingVertical: 12,
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderRadius: 10,
    alignItems: 'center',
    backgroundColor: Colors.white,
  },
  genderOptionSelected: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primaryLight,
  },
  genderText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textMuted,
  },
  genderTextSelected: {
    color: Colors.primary,
  },
  errorText: {
    color: Colors.error,
    fontSize: 12,
    marginTop: 4,
  },
  submitButton: { marginTop: 16 },
});
